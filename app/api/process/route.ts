import { NextRequest, NextResponse } from "next/server"
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

// For App Router - increase max duration for large file processing
export const maxDuration = 60 // seconds

// Normalize column names to match expected format (case-insensitive matching)
function normalizeColumnName(name: string): string {
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

// Normalize NXN lookup column names
function normalizeNxnColumnName(name: string): string {
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

export async function POST(request: NextRequest) {
  try {
    // Accept JSON data (parsed client-side) to avoid Vercel body size limits
    const body = await request.json()
    const { transactionData: rawTransactionData, nxnData: rawNxnData } = body

    if (!rawTransactionData || rawTransactionData.length === 0) {
      return NextResponse.json(
        { error: "Transaction data is required" },
        { status: 400 }
      )
    }

    if (!rawNxnData || rawNxnData.length === 0) {
      return NextResponse.json(
        { error: "NXN lookup data is required" },
        { status: 400 }
      )
    }

    // Normalize transaction data column names
    const transactionData: TransactionRow[] = rawTransactionData.map(
      (row: Record<string, unknown>) => {
        const normalizedRow: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = normalizeColumnName(key)
          normalizedRow[normalizedKey] = value
        }
        return normalizedRow
      }
    ) as TransactionRow[]

    // Normalize NXN lookup column names
    const nxnLookupData: NxnLookupRow[] = rawNxnData.map(
      (row: Record<string, unknown>) => {
        const normalizedRow: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = normalizeNxnColumnName(key)
          normalizedRow[normalizedKey] = value
        }
        return normalizedRow
      }
    ) as NxnLookupRow[]

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
