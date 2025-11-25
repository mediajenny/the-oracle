import { NextRequest, NextResponse } from "next/server"
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
    const formData = await request.formData()

    // Get transaction files
    const transactionFiles = formData.getAll("transactionFiles") as File[]
    const nxnFile = formData.get("nxnFile") as File | null

    if (!transactionFiles || transactionFiles.length === 0) {
      return NextResponse.json(
        { error: "At least one transaction file is required" },
        { status: 400 }
      )
    }

    if (!nxnFile) {
      return NextResponse.json(
        { error: "NXN lookup file is required" },
        { status: 400 }
      )
    }

    // Parse transaction files
    const transactionData: TransactionRow[] = []
    for (const file of transactionFiles) {
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
      const normalizedRows = parsed.data.map((row: Record<string, unknown>) => {
        const normalizedRow: Record<string, unknown> = { "Source File Name": file.name }
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = normalizeColumnName(key)
          normalizedRow[normalizedKey] = value
        }
        return normalizedRow
      })

      transactionData.push(...(normalizedRows as TransactionRow[]))
    }

    // Parse NXN lookup file
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

    const normalizedNxnData = parsedNxn.data.map((row: Record<string, unknown>) => {
      const normalizedRow: Record<string, unknown> = {}
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

    return NextResponse.json({
      results,
      unmatchedNxn,
      summary,
      revenueByFile,
    })
  } catch (error: unknown) {
    console.error("Process error:", error)
    const errorMessage = error instanceof Error ? error.message : "Processing failed"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
