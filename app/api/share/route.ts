import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@vercel/postgres"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { fileId, reportId, sharedWithUserId, sharedWithTeamId } = body

    if (!fileId && !reportId) {
      return NextResponse.json(
        { error: "Either fileId or reportId is required" },
        { status: 400 }
      )
    }

    if (!sharedWithUserId && !sharedWithTeamId) {
      return NextResponse.json(
        { error: "Either sharedWithUserId or sharedWithTeamId is required" },
        { status: 400 }
      )
    }

    if (fileId) {
      // Verify file ownership
      const fileCheck = await sql`
        SELECT id FROM uploaded_files
        WHERE id = ${fileId} AND user_id = ${session.user.id}
      `

      if (fileCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "File not found or access denied" },
          { status: 404 }
        )
      }

      // Check if share already exists
      const existingShare = await sql`
        SELECT id FROM file_shares
        WHERE file_id = ${fileId}
        AND (
          (shared_with_user_id = ${sharedWithUserId || null} AND shared_with_user_id IS NOT NULL)
          OR (shared_with_team_id = ${sharedWithTeamId || null} AND shared_with_team_id IS NOT NULL)
        )
      `

      if (existingShare.rows.length > 0) {
        return NextResponse.json(
          { error: "File already shared with this user/team" },
          { status: 400 }
        )
      }

      // Create share
      await sql`
        INSERT INTO file_shares (file_id, shared_by_user_id, shared_with_user_id, shared_with_team_id)
        VALUES (${fileId}, ${session.user.id}, ${sharedWithUserId || null}, ${sharedWithTeamId || null})
      `
    } else if (reportId) {
      // Verify report ownership
      const reportCheck = await sql`
        SELECT id FROM reports
        WHERE id = ${reportId} AND user_id = ${session.user.id}
      `

      if (reportCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Report not found or access denied" },
          { status: 404 }
        )
      }

      // Check if share already exists
      const existingShare = await sql`
        SELECT id FROM report_shares
        WHERE report_id = ${reportId}
        AND (
          (shared_with_user_id = ${sharedWithUserId || null} AND shared_with_user_id IS NOT NULL)
          OR (shared_with_team_id = ${sharedWithTeamId || null} AND shared_with_team_id IS NOT NULL)
        )
      `

      if (existingShare.rows.length > 0) {
        return NextResponse.json(
          { error: "Report already shared with this user/team" },
          { status: 400 }
        )
      }

      // Create share
      await sql`
        INSERT INTO report_shares (report_id, shared_by_user_id, shared_with_user_id, shared_with_team_id)
        VALUES (${reportId}, ${session.user.id}, ${sharedWithUserId || null}, ${sharedWithTeamId || null})
      `
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Share error:", error)
    return NextResponse.json(
      { error: error.message || "Sharing failed" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // 'files' or 'reports'

    if (type === "files") {
      // Get files shared with user (directly or via team)
      const sharedFiles = await sql`
        SELECT DISTINCT f.id, f.file_name, f.file_type, f.blob_url, f.file_size, f.created_at,
               u.name as shared_by_name, u.email as shared_by_email
        FROM uploaded_files f
        INNER JOIN file_shares fs ON f.id = fs.file_id
        INNER JOIN users u ON fs.shared_by_user_id = u.id
        WHERE (
          fs.shared_with_user_id = ${session.user.id}
          OR (fs.shared_with_team_id = ${session.user.teamId} AND ${session.user.teamId} IS NOT NULL)
        )
        AND f.user_id != ${session.user.id}
        ORDER BY fs.created_at DESC
      `

      return NextResponse.json({ files: sharedFiles.rows })
    } else if (type === "reports") {
      // Get reports shared with user (directly or via team)
      const sharedReports = await sql`
        SELECT DISTINCT r.id, r.name, r.created_at,
               u.name as shared_by_name, u.email as shared_by_email
        FROM reports r
        INNER JOIN report_shares rs ON r.id = rs.report_id
        INNER JOIN users u ON rs.shared_by_user_id = u.id
        WHERE (
          rs.shared_with_user_id = ${session.user.id}
          OR (rs.shared_with_team_id = ${session.user.teamId} AND ${session.user.teamId} IS NOT NULL)
        )
        AND r.user_id != ${session.user.id}
        ORDER BY rs.created_at DESC
      `

      return NextResponse.json({ reports: sharedReports.rows })
    } else {
      return NextResponse.json(
        { error: "Invalid type. Must be 'files' or 'reports'" },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("Get shared items error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch shared items" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shareId = searchParams.get("id")
    const type = searchParams.get("type") // 'file' or 'report'

    if (!shareId || !type) {
      return NextResponse.json(
        { error: "Share ID and type are required" },
        { status: 400 }
      )
    }

    if (type === "file") {
      // Verify ownership of the share
      const shareCheck = await sql`
        SELECT id FROM file_shares
        WHERE id = ${shareId} AND shared_by_user_id = ${session.user.id}
      `

      if (shareCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Share not found or access denied" },
          { status: 404 }
        )
      }

      await sql`DELETE FROM file_shares WHERE id = ${shareId}`
    } else if (type === "report") {
      // Verify ownership of the share
      const shareCheck = await sql`
        SELECT id FROM report_shares
        WHERE id = ${shareId} AND shared_by_user_id = ${session.user.id}
      `

      if (shareCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Share not found or access denied" },
          { status: 404 }
        )
      }

      await sql`DELETE FROM report_shares WHERE id = ${shareId}`
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete share error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete share" },
      { status: 500 }
    )
  }
}

