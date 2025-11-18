import { extractLineItemIds } from "./lineitem-extractor"
import { enrichWithNxnData } from "./nxn-enrichment"

export interface TransactionRow {
  "Transaction ID": string
  "Transaction Total": number
  Impressions: string
  "Source File Name"?: string
  [key: string]: any
}

export interface NxnLookupRow {
  line_item_id: string | number
  line_item_name?: string
  advertiser_name?: string
  insertion_order_id?: string
  insertion_order_name?: string
  packag_id?: string
  package_id?: string
  package_name?: string
  impressions?: number
  advertiser_invoice?: number
  [key: string]: any
}

export interface ProcessedLineItem {
  LINEITEMID: string
  "Unique Transaction Count": number
  "Transaction IDs": string
  "Total Transaction Amount": number
  "NXN Line Item Name"?: string
  "Advertiser Name"?: string
  "Insertion Order ID"?: string
  "Insertion Order Name"?: string
  "Package ID"?: string
  "Package Name"?: string
  "NXN Impressions"?: number
  "NXN Spend"?: number
  "Influenced ROAS (Not Deduplicated)"?: number
  "Match Status": "Matched" | "No Match Found"
}

export interface TransactionLineItemPair {
  LINEITEMID: string
  "Transaction ID": string
  "Transaction Total": number
}

/**
 * Load and combine multiple transaction files, deduplicating by Transaction ID
 */
export function loadMultipleTransactionFiles(
  files: TransactionRow[]
): TransactionRow[] {
  // Deduplicate by Transaction ID (keep first occurrence)
  const seen = new Set<string>()
  const unique: TransactionRow[] = []

  for (const row of files) {
    const transactionId = String(row["Transaction ID"])
    if (transactionId && !seen.has(transactionId)) {
      seen.add(transactionId)
      unique.push(row)
    }
  }

  return unique
}

/**
 * Process transactions to create line item performance report
 */
export function processTransactions(
  transactionData: TransactionRow[],
  nxnLookupData: NxnLookupRow[]
): {
  results: ProcessedLineItem[]
  unmatchedNxn: NxnLookupRow[]
} {
  // Create transaction-lineitem pairs
  const pairs: TransactionLineItemPair[] = []

  for (const row of transactionData) {
    const transactionId = String(row["Transaction ID"])
    const transactionTotal = parseFloat(String(row["Transaction Total"])) || 0
    const impressions = row["Impressions"]

    // Extract unique LINEITEMIDs for this transaction
    const lineItemIds = extractLineItemIds(impressions)

    // Create a record for each unique LINEITEMID in this transaction
    for (const lineItemId of lineItemIds) {
      pairs.push({
        LINEITEMID: lineItemId,
        "Transaction ID": transactionId,
        "Transaction Total": transactionTotal,
      })
    }
  }

  if (pairs.length === 0) {
    return {
      results: [],
      unmatchedNxn: [],
    }
  }

  // Group by LINEITEMID and aggregate
  const grouped = new Map<string, TransactionLineItemPair[]>()

  for (const pair of pairs) {
    const lineItemId = pair.LINEITEMID
    if (!grouped.has(lineItemId)) {
      grouped.set(lineItemId, [])
    }
    grouped.get(lineItemId)!.push(pair)
  }

  // Aggregate metrics
  const aggregated: ProcessedLineItem[] = []

  for (const [lineItemId, pairList] of grouped.entries()) {
    const transactionIds = new Set<string>()
    let totalAmount = 0

    for (const pair of pairList) {
      transactionIds.add(pair["Transaction ID"])
      totalAmount += pair["Transaction Total"]
    }

    aggregated.push({
      LINEITEMID: lineItemId,
      "Unique Transaction Count": transactionIds.size,
      "Transaction IDs": Array.from(transactionIds)
        .sort()
        .map(String)
        .join(", "),
      "Total Transaction Amount": totalAmount,
      "Match Status": "No Match Found",
    })
  }

  // Enrich with NXN data
  const enriched = enrichWithNxnData(aggregated, nxnLookupData)

  // Identify unmatched NXN items
  const matchedLineItemIds = new Set(
    enriched.map((item) => item.LINEITEMID)
  )
  const unmatchedNxn = nxnLookupData.filter((row) => {
    const lineItemId = String(
      typeof row.line_item_id === "number"
        ? row.line_item_id.toString()
        : row.line_item_id
    )
    return !matchedLineItemIds.has(lineItemId)
  })

  return {
    results: enriched,
    unmatchedNxn,
  }
}

/**
 * Calculate summary statistics
 */
export function getSummaryStats(
  results: ProcessedLineItem[],
  nxnLookupData: NxnLookupRow[]
): {
  totalLineItems: number
  matchedLineItems: number
  unmatchedLineItems: number
  totalTransactions: number
  totalRevenue: number
  totalSpend: number
  totalNxnSpend: number
  overallRoas: number | null
} {
  const matchedLineItems = results.filter(
    (r) => r["Match Status"] === "Matched"
  ).length
  const unmatchedLineItems = results.filter(
    (r) => r["Match Status"] === "No Match Found"
  ).length

  const totalTransactions = results.reduce(
    (sum, r) => sum + r["Unique Transaction Count"],
    0
  )

  const totalRevenue = results.reduce(
    (sum, r) => sum + r["Total Transaction Amount"],
    0
  )

  const totalSpend = results.reduce(
    (sum, r) => sum + (r["NXN Spend"] || 0),
    0
  )

  // Calculate total NXN spend from lookup file (all line items)
  const totalNxnSpend = nxnLookupData.reduce(
    (sum, row) => sum + (parseFloat(String(row.advertiser_invoice || 0)) || 0),
    0
  )

  const overallRoas =
    totalSpend > 0 ? totalRevenue / totalSpend : null

  return {
    totalLineItems: results.length,
    matchedLineItems,
    unmatchedLineItems,
    totalTransactions,
    totalRevenue,
    totalSpend,
    totalNxnSpend,
    overallRoas,
  }
}

/**
 * Get revenue by source file
 */
export function getRevenueBySourceFile(
  transactionData: TransactionRow[]
): Array<{ "Source File Name": string; "Total Transaction Amount": number }> {
  const revenueByFile = new Map<string, number>()

  for (const row of transactionData) {
    const fileName = row["Source File Name"] || "Unknown"
    const amount = parseFloat(String(row["Transaction Total"])) || 0
    revenueByFile.set(fileName, (revenueByFile.get(fileName) || 0) + amount)
  }

  return Array.from(revenueByFile.entries())
    .map(([fileName, amount]) => ({
      "Source File Name": fileName,
      "Total Transaction Amount": amount,
    }))
    .sort((a, b) => b["Total Transaction Amount"] - a["Total Transaction Amount"])
}

