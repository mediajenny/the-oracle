"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportToExcel } from "@/lib/exporters/excel-exporter"
import { exportToCSV } from "@/lib/exporters/csv-exporter"
import type { ProcessedLineItem } from "@/components/ReportTable"

interface ExportButtonsProps {
  data: ProcessedLineItem[]
  reportName?: string
}

export function ExportButtons({ data, reportName }: ExportButtonsProps) {
  const handleExportExcel = () => {
    const fileName = reportName ? `${reportName}.xlsx` : "line_item_performance_report.xlsx"
    exportToExcel(data, fileName)
  }

  const handleExportCSV = () => {
    const fileName = reportName ? `${reportName}.csv` : "line_item_performance_report.csv"
    exportToCSV(data, fileName)
  }

  return (
    <div className="flex gap-4">
      <Button onClick={handleExportExcel} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Download Excel Report
      </Button>
      <Button onClick={handleExportCSV} variant="outline">
        <Download className="mr-2 h-4 w-4" />
        Download CSV Report
      </Button>
    </div>
  )
}
