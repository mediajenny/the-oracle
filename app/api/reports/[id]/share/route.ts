import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
import { randomBytes } from "crypto"

// GET /api/reports/[id]/share - Get or generate share link
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reportId = params.id

    // Verify ownership
    const reportResult = await sql`
      SELECT id, share_token
      FROM reports
      WHERE id = ${reportId} AND user_id = ${session.user.id}
    `

    if (reportResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      )
    }

    const report = reportResult.rows[0]
    let shareToken = report.share_token

    // Generate share token if it doesn't exist
    if (!shareToken) {
      shareToken = randomBytes(32).toString("base64url")
      await sql`
        UPDATE reports
        SET share_token = ${shareToken}
        WHERE id = ${reportId}
      `
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (request.headers.get("host") ? `https://${request.headers.get("host")}` : "")
    const shareUrl = `${baseUrl}/share/${shareToken}`

    return NextResponse.json({
      shareToken,
      shareUrl,
    })
  } catch (error: any) {
    console.error("Get share link error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get share link" },
      { status: 500 }
    )
  }
}

// DELETE /api/reports/[id]/share - Revoke share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reportId = params.id

    // Verify ownership
    const reportResult = await sql`
      SELECT id FROM reports
      WHERE id = ${reportId} AND user_id = ${session.user.id}
    `

    if (reportResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      )
    }

    // Remove share token
    await sql`
      UPDATE reports
      SET share_token = NULL
      WHERE id = ${reportId}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Revoke share link error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to revoke share link" },
      { status: 500 }
    )
  }
}

