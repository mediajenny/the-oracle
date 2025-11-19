import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { sql } from "@/lib/db"
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
    const { transactionFileIds, nxnFileId, reportName } = body

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
      SELECT id, blob_url, file_name, mime_type
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
      SELECT id, blob_url, file_name, mime_type
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
      let file: File

      // Handle local file paths vs Vercel Blob URLs
      if (fileMeta.blob_url.startsWith("/uploads/")) {
        // Local file - read from filesystem
        const { readFile } = await import("fs/promises")
        const { join } = await import("path")
        const filePath = join(process.cwd(), "public", fileMeta.blob_url)
        const buffer = await readFile(filePath)
        file = new File([buffer], fileMeta.file_name, {
          type: fileMeta.mime_type || "application/octet-stream",
        })
      } else {
        // Vercel Blob URL - fetch from remote
        const fileResponse = await fetch(fileMeta.blob_url)
        const blob = await fileResponse.blob()
        file = new File([blob], fileMeta.file_name, {
          type: blob.type,
        })
      }

      const parsed = await parseFile(file)

      // Normalize column names to match expected format (case-insensitive matching)
      const normalizeColumnName = (name: string): string => {
        const normalized = name?.toString().trim().toLowerCase() || ""
        // Map common variations to expected column names
        const columnMap: Record<string, string> = {
          "transaction id": "Transaction ID",
          "transaction_id": "Transaction ID",
          "transactionid": "Transaction ID",
          "transaction total": "Transaction Total",
          "transaction_total": "Transaction Total",
          "transactiontotal": "Transaction Total",
          "impressions": "Impressions",
        }
        return columnMap[normalized] || name
      }

      // Normalize column names in the data
      const normalizedRows = parsed.data.map((row: any) => {
        const normalizedRow: any = { "Source File Name": fileMeta.file_name }
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = normalizeColumnName(key)
          normalizedRow[normalizedKey] = value
        }
        return normalizedRow
      })

      transactionData.push(...normalizedRows)
    }

    // Fetch and parse NXN lookup file
    const nxnFileMeta = nxnFileResult.rows[0]
    let nxnFile: File

    // Handle local file paths vs Vercel Blob URLs
    if (nxnFileMeta.blob_url.startsWith("/uploads/")) {
      // Local file - read from filesystem
      const { readFile } = await import("fs/promises")
      const { join } = await import("path")
      const filePath = join(process.cwd(), "public", nxnFileMeta.blob_url)
      const buffer = await readFile(filePath)
      nxnFile = new File([buffer], nxnFileMeta.file_name, {
        type: nxnFileMeta.mime_type || "application/octet-stream",
      })
    } else {
      // Vercel Blob URL - fetch from remote
      const nxnFileResponse = await fetch(nxnFileMeta.blob_url)
      const nxnBlob = await nxnFileResponse.blob()
      nxnFile = new File([nxnBlob], nxnFileMeta.file_name, {
        type: nxnBlob.type,
      })
    }

    const parsedNxn = await parseFile(nxnFile, { headerRow: 1 })

    // Normalize NXN lookup column names
    const normalizeNxnColumnName = (name: string): string => {
      const normalized = name?.toString().trim().toLowerCase() || ""
      const columnMap: Record<string, string> = {
        "line_item_id": "line_item_id",
        "line item id": "line_item_id",
        "lineitemid": "line_item_id",
        "line_item_name": "line_item_name",
        "line item name": "line_item_name",
        "lineitemname": "line_item_name",
        "impressions": "impressions",
        "advertiser_invoice": "advertiser_invoice",
        "advertiser invoice": "advertiser_invoice",
        "advertiserinvoice": "advertiser_invoice",
      }
      return columnMap[normalized] || name
    }

    const normalizedNxnData = parsedNxn.data.map((row: any) => {
      const normalizedRow: any = {}
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeNxnColumnName(key)
        normalizedRow[normalizedKey] = value
      }
      return normalizedRow
    })

    const nxnLookupData: NxnLookupRow[] = normalizedNxnData as NxnLookupRow[]

    // Process transactions
    const deduplicatedTransactions = loadMultipleTransactionFiles(transactionData)
    const { results, unmatchedNxn } = processTransactions(
      deduplicatedTransactions,
      nxnLookupData
    )

    // Calculate summary stats
    const summary = getSummaryStats(results, nxnLookupData)
    const revenueByFile = getRevenueBySourceFile(deduplicatedTransactions)

    // Generate default name if not provided
    const finalReportName = reportName?.trim() || `Report ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`

    // Generate unique share token
    const { randomBytes } = await import("crypto")
    const shareToken = randomBytes(32).toString("base64url")

    // Save report to database
    const reportResult = await sql`
      INSERT INTO reports (user_id, name, transaction_file_ids, nxn_file_id, report_data, share_token)
      VALUES (
        ${session.user.id},
        ${finalReportName},
        ${transactionFileIds}::uuid[],
        ${nxnFileId},
        ${JSON.stringify({
          results,
          unmatchedNxn,
          summary,
          revenueByFile,
        })}::jsonb,
        ${shareToken}
      )
      RETURNING id, created_at, share_token
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
