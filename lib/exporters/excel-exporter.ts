import * as XLSX from "xlsx"
import type { ProcessedLineItem } from "@/components/ReportTable"

export function exportToExcel(data: ProcessedLineItem[], fileName: string = "line_item_performance_report.xlsx") {
  // Prepare data for export
  const exportData = data.map((row) => ({
    "Advertiser Name": row["Advertiser Name"] || "",
    "Insertion Order ID": row["Insertion Order ID"] || "",
    "Insertion Order Name": row["Insertion Order Name"] || "",
    "Package ID": row["Package ID"] || "",
    "Package Name": row["Package Name"] || "",
    LINEITEMID: row.LINEITEMID,
    "NXN Line Item Name": row["NXN Line Item Name"] || "",
    "Unique Transaction Count": row["Unique Transaction Count"],
    "Total Transaction Amount": row["Total Transaction Amount"],
    "NXN Impressions": row["NXN Impressions"] || 0,
    "NXN Spend": row["NXN Spend"] || 0,
    "Influenced ROAS (Not Deduplicated)":
      row["Influenced ROAS (Not Deduplicated)"] || "",
    "Transaction IDs": row["Transaction IDs"],
  }))

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(exportData)

  // Set column widths
  const colWidths = [
    { wch: 20 }, // Advertiser Name
    { wch: 20 }, // Insertion Order ID
    { wch: 30 }, // Insertion Order Name
    { wch: 15 }, // Package ID
    { wch: 25 }, // Package Name
    { wch: 20 }, // LINEITEMID
    { wch: 40 }, // NXN Line Item Name
    { wch: 25 }, // Unique Transaction Count
    { wch: 25 }, // Total Transaction Amount
    { wch: 20 }, // NXN Impressions
    { wch: 15 }, // NXN Spend
    { wch: 35 }, // Influenced ROAS
    { wch: 50 }, // Transaction IDs
  ]
  ws["!cols"] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Line Item Performance")

  // Write file
  XLSX.writeFile(wb, fileName)
}

