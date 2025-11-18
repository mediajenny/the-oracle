import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@vercel/postgres"
import { parseFile } from "@/lib/file-parsers"
import {
  processTransactions,
  loadMultipleTransactionFiles,
  getSummaryStats,
  getRevenueBySourceFile,
} from "@/lib/processors/transaction-processor"
import type {
  TransactionRow,
  NxnLookupRow,
} from "@/lib/processors/transaction-processor"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { transactionFileIds, nxnFileId } = body

    if (!transactionFileIds || !Array.isArray(transactionFileIds) || transactionFileIds.length === 0) {
      return NextResponse.json(
        { error: "At least one transaction file is required" },
        { status: 400 }
      )
    }

    if (!nxnFileId) {
      return NextResponse.json(
        { error: "NXN lookup file is required" },
        { status: 400 }
      )
    }

    // Fetch file metadata and verify ownership
    const transactionFilesResult = await sql`
      SELECT id, blob_url, file_name
      FROM uploaded_files
      WHERE id = ANY(${transactionFileIds}) AND user_id = ${session.user.id}
    `

    if (transactionFilesResult.rows.length !== transactionFileIds.length) {
      return NextResponse.json(
        { error: "One or more transaction files not found or access denied" },
        { status: 404 }
      )
    }

    const nxnFileResult = await sql`
      SELECT id, blob_url, file_name
      FROM uploaded_files
      WHERE id = ${nxnFileId} AND user_id = ${session.user.id}
    `

    if (nxnFileResult.rows.length === 0) {
      return NextResponse.json(
        { error: "NXN lookup file not found or access denied" },
        { status: 404 }
      )
    }

    // Fetch and parse transaction files
    const transactionData: TransactionRow[] = []
    for (const fileMeta of transactionFilesResult.rows) {
      const fileResponse = await fetch(fileMeta.blob_url)
      const blob = await fileResponse.blob()
      const file = new File([blob], fileMeta.file_name, {
        type: blob.type,
      })

      const parsed = await parseFile(file)
      const rows = parsed.data.map((row: any) => ({
        ...row,
        "Source File Name": fileMeta.file_name,
      }))
      transactionData.push(...rows)
    }

    // Fetch and parse NXN lookup file
    const nxnFileMeta = nxnFileResult.rows[0]
    const nxnFileResponse = await fetch(nxnFileMeta.blob_url)
    const nxnBlob = await nxnFileResponse.blob()
    const nxnFile = new File([nxnBlob], nxnFileMeta.file_name, {
      type: nxnBlob.type,
    })

    const parsedNxn = await parseFile(nxnFile, { headerRow: 1 })
    const nxnLookupData: NxnLookupRow[] = parsedNxn.data as NxnLookupRow[]

    // Process transactions
    const deduplicatedTransactions = loadMultipleTransactionFiles(transactionData)
    const { results, unmatchedNxn } = processTransactions(
      deduplicatedTransactions,
      nxnLookupData
    )

    // Calculate summary stats
    const summary = getSummaryStats(results, nxnLookupData)
    const revenueByFile = getRevenueBySourceFile(deduplicatedTransactions)

    // Save report to database
    const reportResult = await sql`
      INSERT INTO reports (user_id, transaction_file_ids, nxn_file_id, report_data)
      VALUES (
        ${session.user.id},
        ${transactionFileIds}::uuid[],
        ${nxnFileId},
        ${JSON.stringify({
          results,
          unmatchedNxn,
          summary,
          revenueByFile,
        })}::jsonb
      )
      RETURNING id, created_at
    `

    return NextResponse.json({
      success: true,
      report: {
        id: reportResult.rows[0].id,
        createdAt: reportResult.rows[0].created_at,
        results,
        unmatchedNxn,
        summary,
        revenueByFile,
      },
    })
  } catch (error: any) {
    console.error("Process error:", error)
    return NextResponse.json(
      { error: error.message || "Processing failed" },
      { status: 500 }
    )
  }
}

