import type { ProcessedLineItem } from "@/components/ReportTable"

export function exportToCSV(data: ProcessedLineItem[], fileName: string = "line_item_performance_report.csv") {
  // Define columns in order
  const columns = [
    "Advertiser Name",
    "Insertion Order ID",
    "Insertion Order Name",
    "Package ID",
    "Package Name",
    "LINEITEMID",
    "NXN Line Item Name",
    "Unique Transaction Count",
    "Total Transaction Amount",
    "NXN Impressions",
    "NXN Spend",
    "Influenced ROAS (Not Deduplicated)",
    "Transaction IDs",
  ]

  // Create CSV header
  const header = columns.join(",")

  // Create CSV rows
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col as keyof ProcessedLineItem]
        if (value === undefined || value === null) {
          return ""
        }
        // Escape commas and quotes in CSV
        const str = String(value)
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(",")
  })

  // Combine header and rows
  const csvContent = [header, ...rows].join("\n")

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", fileName)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

