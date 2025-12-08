import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Default user ID for anonymous users (no authentication)
const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get("id")

    if (reportId) {
      // Get single report
      const result = await sql`
        SELECT
          r.id,
          r.name,
          r.report_type,
          r.transaction_file_ids,
          r.nxn_file_id,
          r.report_data,
          r.share_token,
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
          END as nxn_file
        FROM reports r
        LEFT JOIN uploaded_files uf ON uf.id = ANY(r.transaction_file_ids)
        LEFT JOIN uploaded_files nxn_file ON nxn_file.id = r.nxn_file_id
        WHERE r.id = ${reportId}
        GROUP BY r.id, r.name, r.report_type, r.transaction_file_ids, r.nxn_file_id, r.report_data, r.share_token, r.created_at, r.updated_at,
                 nxn_file.id, nxn_file.file_name, nxn_file.file_size, nxn_file.row_count, nxn_file.created_at
      `

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 })
      }

      return NextResponse.json({ report: result.rows[0] })
    } else {
      // Get all reports
      const result = await sql`
        SELECT
          r.id,
          r.name,
          r.report_type,
          r.created_at,
          r.updated_at,
          r.report_data->'summary'->>'totalLineItems' as total_line_items,
          r.report_data->'summary'->>'totalTransactions' as total_transactions,
          r.report_data->'summary'->>'totalRevenue' as total_revenue,
          array_length(r.transaction_file_ids, 1) as transaction_file_count
        FROM reports r
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, report_type, report_data } = body

    if (!name) {
      return NextResponse.json({ error: "Report name is required" }, { status: 400 })
    }

    if (!report_data) {
      return NextResponse.json({ error: "Report data is required" }, { status: 400 })
    }

    const reportType = report_type || 'dashboard_line_item_performance'

    const result = await sql`
      INSERT INTO reports (user_id, name, report_type, report_data)
      VALUES (${ANONYMOUS_USER_ID}, ${name}, ${reportType}, ${JSON.stringify(report_data)})
      RETURNING id, name, report_type, created_at
    `

    return NextResponse.json({
      success: true,
      report: result.rows[0]
    })
  } catch (error: any) {
    console.error("Report save error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save report" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get("id")

    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 })
    }

    // Check if report exists
    const checkResult = await sql`
      SELECT id FROM reports WHERE id = ${reportId}
    `

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
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
