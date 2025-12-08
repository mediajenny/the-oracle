"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { MetricsCards } from "@/components/MetricsCards"
import { ReportTable } from "@/components/ReportTable"
import { TopLineItemsRanking } from "@/components/TopLineItemsRanking"
import { FilterAndSearch } from "@/components/FilterAndSearch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Upload, FileText, X, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExportButtons } from "@/components/ExportButtons"
import { parseFile } from "@/lib/client-file-parsers"
import {
  processTransactions,
  loadMultipleTransactionFiles,
  getSummaryStats,
  getRevenueBySourceFile,
} from "@/lib/processors/transaction-processor"
import type { TransactionRow, NxnLookupRow } from "@/lib/processors/transaction-processor"
import type { ProcessedLineItem } from "@/components/ReportTable"

interface ReportData {
  results: ProcessedLineItem[]
  unmatchedNxn: any[]
  summary: any
  revenueByFile: any[]
}

interface UploadedFile {
  file: File
  name: string
  size: number
}

// Helper to get today's date in MM.DD.YY format
function getTodayFormatted(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const year = String(now.getFullYear()).slice(-2)
  return `${month}.${day}.${year}`
}

export default function ReportsPage() {
  const [transactionFiles, setTransactionFiles] = useState<UploadedFile[]>([])
  const [nxnFile, setNxnFile] = useState<UploadedFile | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Report naming state
  const [advertiser, setAdvertiser] = useState("")
  const [campaign, setCampaign] = useState("")
  const [bridge, setBridge] = useState("")
  const [reportName, setReportName] = useState(getTodayFormatted())
  const [isEditingName, setIsEditingName] = useState(false)

  // Filter state
  const [globalSearchTerm, setGlobalSearchTerm] = useState("")
  const [globalInsertionOrderFilter, setGlobalInsertionOrderFilter] = useState<string[]>([])
  const [globalAdvertiserFilter, setGlobalAdvertiserFilter] = useState<string[]>([])

  // Auto-generate report name when fields change
  useEffect(() => {
    if (!isEditingName) {
      const parts = [getTodayFormatted()]
      if (advertiser.trim()) parts.push(advertiser.trim())
      if (campaign.trim()) parts.push(campaign.trim())
      if (bridge.trim()) parts.push(bridge.trim())
      setReportName(parts.join('_'))
    }
  }, [advertiser, campaign, bridge, isEditingName])

  const onDropTransactions = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
    }))
    setTransactionFiles(prev => [...prev, ...newFiles])
    setError(null)
  }, [])

  const onDropNxn = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setNxnFile({
        file,
        name: file.name,
        size: file.size,
      })
      setError(null)
    }
  }, [])

  const transactionDropzone = useDropzone({
    onDrop: onDropTransactions,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  })

  const nxnDropzone = useDropzone({
    onDrop: onDropNxn,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  })

  const removeTransactionFile = (index: number) => {
    setTransactionFiles(prev => prev.filter((_, i) => i !== index))
  }

  const generateReport = async () => {
    if (transactionFiles.length === 0 || !nxnFile) {
      setError("Please upload at least one transaction file and one NXN lookup file")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Parse files client-side
      const transactionDataPromises = transactionFiles.map(async (f) => {
        const parsed = await parseFile(f.file)
        // Add source file name to each row
        return parsed.data.map(row => ({ ...row, "Source File Name": f.name }))
      })

      const transactionDataArrays = await Promise.all(transactionDataPromises)
      const transactionData = transactionDataArrays.flat() as TransactionRow[]

      // Parse NXN file with header on row 2 (index 1)
      const nxnParsed = await parseFile(nxnFile.file, { headerRow: 1 })
      const nxnData = nxnParsed.data as NxnLookupRow[]

      // Process entirely client-side to avoid body size limits
      const deduplicatedTransactions = loadMultipleTransactionFiles(transactionData)
      const { results, unmatchedNxn } = processTransactions(
        deduplicatedTransactions,
        nxnData
      )
      const summary = getSummaryStats(results, nxnData)
      const revenueByFile = getRevenueBySourceFile(deduplicatedTransactions)

      setReportData({
        results,
        unmatchedNxn,
        summary,
        revenueByFile,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while processing files")
    } finally {
      setLoading(false)
    }
  }

  const resetReport = () => {
    setReportData(null)
    setTransactionFiles([])
    setNxnFile(null)
    setError(null)
    setGlobalSearchTerm("")
    setGlobalInsertionOrderFilter([])
    setGlobalAdvertiserFilter([])
    setAdvertiser("")
    setCampaign("")
    setBridge("")
    setReportName(getTodayFormatted())
    setIsEditingName(false)
  }

  // Show report view if we have data
  if (reportData) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{reportName}</h1>
            <p className="text-muted-foreground mt-2">
              Generated from {transactionFiles.length} transaction file(s) and NXN lookup
            </p>
          </div>
          <Button variant="outline" onClick={resetReport}>
            Create New Report
          </Button>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-800">
              💡 Use summary metrics internally only, do not report these to the client since
              these are showing total duplicated revenue and transaction impact. These are not
              deduplicated transactions.
            </p>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Summary Metrics</h2>
          <MetricsCards summary={reportData.summary} />
        </div>

        {/* Filter & Search */}
        <FilterAndSearch
          data={reportData.results}
          searchTerm={globalSearchTerm}
          onSearchChange={setGlobalSearchTerm}
          insertionOrderFilter={globalInsertionOrderFilter}
          onInsertionOrderFilterChange={setGlobalInsertionOrderFilter}
          advertiserFilter={globalAdvertiserFilter}
          onAdvertiserFilterChange={setGlobalAdvertiserFilter}
        />

        {/* Top Performing Line Items */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Top Performing Line Items</h2>
          <TopLineItemsRanking
            data={reportData.results}
            topCount={10}
            globalSearch={globalSearchTerm}
            insertionOrderFilter={globalInsertionOrderFilter}
          />
        </div>

        {/* Line Item Performance Table */}
        <ReportTable
          data={reportData.results}
          searchTerm={globalSearchTerm}
          onSearchChange={setGlobalSearchTerm}
          insertionOrderFilter={globalInsertionOrderFilter}
          onInsertionOrderFilterChange={setGlobalInsertionOrderFilter}
          advertiserFilter={globalAdvertiserFilter}
          onAdvertiserFilterChange={setGlobalAdvertiserFilter}
        />

        {/* Export Buttons */}
        <div className="flex justify-end">
          <ExportButtons data={reportData.results} reportName={reportName} />
        </div>

        {reportData.unmatchedNxn.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>NXN Line Items Not Matched to Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                ⚠ {reportData.unmatchedNxn.length} line items in NXN file have no matching
                transactions.
              </p>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">LINEITEMID</th>
                      <th className="p-2 text-left">NXN Line Item Name</th>
                      <th className="p-2 text-left">NXN Impressions</th>
                      <th className="p-2 text-left">DSP Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.unmatchedNxn.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2">{item.line_item_id}</td>
                        <td className="p-2">{item.line_item_name || ""}</td>
                        <td className="p-2">{item.impressions?.toLocaleString() || ""}</td>
                        <td className="p-2">
                          {item.advertiser_invoice
                            ? `$${item.advertiser_invoice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Show upload form
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Line Item Performance Report</h1>
        <p className="text-muted-foreground mt-2">
          Analyze transaction data to show line item performance by extracting LINEITEMID values
          from impression journeys and aggregating transaction counts and amounts by line item.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Transaction Files Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Files</CardTitle>
            <CardDescription>
              Upload one or more transaction export files (CSV or Excel)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...transactionDropzone.getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                transactionDropzone.isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...transactionDropzone.getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports CSV, XLSX, XLS
              </p>
            </div>

            {transactionFiles.length > 0 && (
              <div className="space-y-2">
                {transactionFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeTransactionFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* NXN Lookup File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>NXN Lookup File</CardTitle>
            <CardDescription>
              Upload the NXN lookup file with line item details (CSV or Excel)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              {...nxnDropzone.getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                nxnDropzone.isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...nxnDropzone.getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop file here, or click to select
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports CSV, XLSX, XLS
              </p>
            </div>

            {nxnFile && (
              <div className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate max-w-[200px]">{nxnFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(nxnFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setNxnFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Details */}
      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>
            Name format: MM.DD.YY_Advertiser_Campaign_Bridge (Optional)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="advertiser">Advertiser *</Label>
              <Input
                id="advertiser"
                placeholder="Enter advertiser name"
                value={advertiser}
                onChange={(e) => setAdvertiser(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign">Campaign *</Label>
              <Input
                id="campaign"
                placeholder="Enter campaign name"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bridge">Bridge (Optional)</Label>
              <Input
                id="bridge"
                placeholder="Enter bridge (optional)"
                value={bridge}
                onChange={(e) => setBridge(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reportName">Report Name</Label>
            <div className="flex gap-2">
              <Input
                id="reportName"
                value={reportName}
                onChange={(e) => {
                  setReportName(e.target.value)
                  setIsEditingName(true)
                }}
                className="flex-1"
              />
              {isEditingName && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingName(false)}
                >
                  Reset
                </Button>
              )}
            </div>
            {isEditingName && (
              <p className="text-xs text-muted-foreground">
                Editing manually. Click Reset to auto-generate from fields.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-destructive/10 border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={generateReport}
          disabled={loading || transactionFiles.length === 0 || !nxnFile || !advertiser.trim() || !campaign.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Generate Report"
          )}
        </Button>
      </div>
      {(transactionFiles.length > 0 || nxnFile) && (!advertiser.trim() || !campaign.trim()) && (
        <p className="text-center text-sm text-muted-foreground">
          Please enter Advertiser and Campaign to generate the report
        </p>
      )}
    </div>
  )
}
