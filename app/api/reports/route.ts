import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get("id")

    if (reportId) {
      // Get single report (owned by user)
      const result = await sql`
        SELECT 
          r.id,
          r.name,
          r.transaction_file_ids,
          r.nxn_file_id,
          r.report_data,
          r.created_at,
          r.updated_at,
          COALESCE(
            jsonb_agg(
              DISTINCT jsonb_build_object(
                'id', uf.id,
                'file_name', uf.file_name,
                'file_size', uf.file_size,
                'row_count', uf.row_count,
                'created_at', uf.created_at
              )
            ) FILTER (WHERE uf.id IS NOT NULL),
            '[]'::jsonb
          ) as transaction_files,
          CASE 
            WHEN nxn_file.id IS NOT NULL THEN
              jsonb_build_object(
                'id', nxn_file.id,
                'file_name', nxn_file.file_name,
                'file_size', nxn_file.file_size,
                'row_count', nxn_file.row_count,
                'created_at', nxn_file.created_at
              )
            ELSE NULL
          END as nxn_file,
          u.name as author_name,
          u.email as author_email
        FROM reports r
        LEFT JOIN uploaded_files uf ON uf.id = ANY(r.transaction_file_ids)
        LEFT JOIN uploaded_files nxn_file ON nxn_file.id = r.nxn_file_id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ${reportId}
          AND r.user_id = ${session.user.id}
        GROUP BY r.id, r.name, r.transaction_file_ids, r.nxn_file_id, r.report_data, r.created_at, r.updated_at, 
                 nxn_file.id, nxn_file.file_name, nxn_file.file_size, nxn_file.row_count, nxn_file.created_at, 
                 u.name, u.email
      `

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 })
      }

      return NextResponse.json({ report: result.rows[0] })
    } else {
      // Get all reports for user (including shared reports)
      const teamId = (session.user as any).teamId
      
      // Simple query - get user's own reports first
      const result = await sql`
        SELECT 
          r.id,
          r.name,
          r.created_at,
          r.updated_at,
          r.report_data->'summary'->>'totalLineItems' as total_line_items,
          r.report_data->'summary'->>'totalTransactions' as total_transactions,
          r.report_data->'summary'->>'totalRevenue' as total_revenue,
          array_length(r.transaction_file_ids, 1) as transaction_file_count,
          u.name as author_name,
          u.email as author_email
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.user_id = ${session.user.id}
        ORDER BY r.created_at DESC
      `

      return NextResponse.json({ reports: result.rows })
    }
  } catch (error: any) {
    console.error("Reports fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch reports" },
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
    const reportId = searchParams.get("id")

    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 })
    }

    // Verify ownership before deleting
    const checkResult = await sql`
      SELECT id FROM reports WHERE id = ${reportId} AND user_id = ${session.user.id}
    `

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Report not found or access denied" }, { status: 404 })
    }

    await sql`DELETE FROM reports WHERE id = ${reportId}`

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Report delete error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete report" },
      { status: 500 }
    )
  }
}

