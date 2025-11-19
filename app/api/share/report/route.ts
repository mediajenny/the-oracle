import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

// GET /api/share/report?token=<shareToken> - Get shared report by token (requires authentication)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required to view shared reports" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Share token is required" },
        { status: 400 }
      )
    }

    // Get report by share token - verify user has access
    // User can access if: they own it, it's shared with them, or they have the share token
    const result = await sql`
      SELECT 
        r.id,
        r.name,
        r.report_data,
        r.created_at,
        r.user_id,
        u.name as author_name,
        u.email as author_email,
        CASE 
          WHEN r.user_id = ${session.user.id} THEN true
          WHEN EXISTS (
            SELECT 1 FROM report_shares rs
            WHERE rs.report_id = r.id
            AND (
              rs.shared_with_user_id = ${session.user.id}
              OR (rs.shared_with_team_id = ${session.user.teamId} AND ${session.user.teamId} IS NOT NULL)
            )
          ) THEN true
          WHEN r.share_token = ${token} THEN true
          ELSE false
        END as has_access
      FROM reports r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.share_token = ${token}
    `

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Report not found or link is invalid" },
        { status: 404 }
      )
    }

    if (!result.rows[0].has_access) {
      return NextResponse.json(
        { error: "You do not have access to this report" },
        { status: 403 }
      )
    }

    return NextResponse.json({ report: result.rows[0] })
  } catch (error: any) {
    console.error("Get shared report error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch shared report" },
      { status: 500 }
    )
  }
}

