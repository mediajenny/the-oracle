/**
 * Extract unique LINEITEMID values from an Impressions JSON string
 */

export function extractLineItemIds(impressionsStr: string | null | undefined): string[] {
  if (!impressionsStr || impressionsStr === "") {
    return []
  }

  try {
    // Parse JSON array
    const impressions = JSON.parse(impressionsStr)

    if (!Array.isArray(impressions)) {
      return []
    }

    // Extract unique LINEITEMIDs
    const lineItemIds: string[] = []
    const seen = new Set<string>()

    for (const impression of impressions) {
      if (
        typeof impression === "object" &&
        impression !== null &&
        "LINEITEMID" in impression
      ) {
        const lineItemId = String(impression.LINEITEMID)
        if (lineItemId && !seen.has(lineItemId)) {
          seen.add(lineItemId)
          lineItemIds.push(lineItemId)
        }
      }
    }

    return lineItemIds
  } catch (error) {
    console.error("Error parsing impressions:", error)
    return []
  }
}

