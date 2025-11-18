import { ProcessedLineItem } from "./transaction-processor"

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

/**
 * Enrich aggregated data with NXN lookup information
 */
export function enrichWithNxnData(
  aggregated: ProcessedLineItem[],
  nxnLookupData: NxnLookupRow[]
): ProcessedLineItem[] {
  // Build lookup map from NXN data
  const nxnMap = new Map<string, NxnLookupRow>()

  for (const row of nxnLookupData) {
    const lineItemId = String(
      typeof row.line_item_id === "number"
        ? row.line_item_id.toString()
        : row.line_item_id
    )

    // Handle duplicates by aggregating numeric fields
    if (nxnMap.has(lineItemId)) {
      const existing = nxnMap.get(lineItemId)!
      // Sum impressions and spend
      existing.impressions =
        (existing.impressions || 0) + (row.impressions || 0)
      existing.advertiser_invoice =
        (existing.advertiser_invoice || 0) + (row.advertiser_invoice || 0)
    } else {
      nxnMap.set(lineItemId, { ...row })
    }
  }

  // Enrich aggregated data
  const enriched = aggregated.map((item) => {
    const lineItemId = String(item.LINEITEMID)
    const nxnData = nxnMap.get(lineItemId)

    if (!nxnData) {
      return {
        ...item,
        "Match Status": "No Match Found" as const,
      }
    }

    // Use package_id if packag_id doesn't exist
    const packageId = nxnData.package_id || nxnData.packag_id

    const enrichedItem: ProcessedLineItem = {
      ...item,
      "NXN Line Item Name": nxnData.line_item_name,
      "Advertiser Name": nxnData.advertiser_name,
      "Insertion Order ID": nxnData.insertion_order_id,
      "Insertion Order Name": nxnData.insertion_order_name,
      "Package ID": packageId,
      "Package Name": nxnData.package_name,
      "NXN Impressions": nxnData.impressions,
      "NXN Spend": nxnData.advertiser_invoice,
      "Match Status": "Matched" as const,
    }

    // Calculate ROAS
    if (enrichedItem["NXN Spend"] && enrichedItem["NXN Spend"] > 0) {
      enrichedItem["Influenced ROAS (Not Deduplicated)"] =
        enrichedItem["Total Transaction Amount"] / enrichedItem["NXN Spend"]
    }

    return enrichedItem
  })

  return enriched
}

