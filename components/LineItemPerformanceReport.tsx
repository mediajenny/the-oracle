"use client"

import { useState, useEffect } from "react"
import { ReportWizard } from "@/components/ReportWizard"
import { ReportsList } from "@/components/ReportsList"
import { FilesLibrary } from "@/components/FilesLibrary"
import { MetricsCards } from "@/components/MetricsCards"
import { ReportTable } from "@/components/ReportTable"
import { TopLineItemsRanking } from "@/components/TopLineItemsRanking"
import { FilterAndSearch } from "@/components/FilterAndSearch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, ArrowLeft, AlertCircle, User, FileText, Calendar, Download, Share2, Copy, Check } from "lucide-react"
import { ExportButtons } from "@/components/ExportButtons"
import type { ProcessedLineItem } from "@/components/ReportTable"
import { format } from "date-fns"

interface ReportData {
  results: ProcessedLineItem[]
  unmatchedNxn: any[]
  summary: any
  revenueByFile: any[]
}

export function LineItemPerformanceReport() {
  const [activeTab, setActiveTab] = useState<"list" | "create" | "view" | "files">("list")
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [viewingReportId, setViewingReportId] = useState<string | null>(null)

  // Shared filter state for both ReportTable and TopLineItemsRanking
  const [globalSearchTerm, setGlobalSearchTerm] = useState("")
  const [globalInsertionOrderFilter, setGlobalInsertionOrderFilter] = useState<string[]>([])
  const [globalAdvertiserFilter, setGlobalAdvertiserFilter] = useState<string[]>([])
  const [viewingReportMeta, setViewingReportMeta] = useState<{
    name?: string
    author_name?: string
    author_email?: string
    created_at?: string
    share_token?: string
    transaction_files?: Array<{
      id: string
      file_name: string
      file_size: number
      row_count?: number
      created_at: string
    }>
    nxn_file?: {
      id: string
      file_name: string
      file_size: number
      row_count?: number
      created_at: string
    }
  } | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [shareUrl, setShareUrl] = useState<string>("")
  const [copied, setCopied] = useState(false)

  const handleDownloadFile = (fileId: string, fileName: string) => {
    const downloadUrl = `/api/upload?id=${fileId}&download=true`
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const fetchShareLink = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/share`)
      if (!response.ok) {
        throw new Error("Failed to get share link")
      }
      const data = await response.json()
      setShareUrl(data.shareUrl)
      setViewingReportMeta((prev) => ({
        ...prev,
        share_token: data.shareToken,
      }))
    } catch (error) {
      console.error("Failed to fetch share link:", error)
    }
  }

  const handleCopyShareLink = async () => {
    let urlToCopy = shareUrl

    if (!urlToCopy && viewingReportId) {
      try {
        const response = await fetch(`/api/reports/${viewingReportId}/share`)
        if (!response.ok) {
          throw new Error("Failed to get share link")
        }
        const data = await response.json()
        urlToCopy = data.shareUrl
        setShareUrl(urlToCopy)
        setViewingReportMeta((prev) => ({
          ...prev,
          share_token: data.shareToken,
        }))
      } catch (error) {
        console.error("Failed to fetch share link:", error)
        alert("Failed to generate share link")
        return
      }
    }

    if (urlToCopy) {
      await navigator.clipboard.writeText(urlToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRevokeShareLink = async () => {
    if (!viewingReportId) return

    try {
      const response = await fetch(`/api/reports/${viewingReportId}/share`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Failed to revoke share link")
      }
      setShareUrl("")
      setViewingReportMeta((prev) => ({
        ...prev,
        share_token: undefined,
      }))
    } catch (error) {
      console.error("Failed to revoke share link:", error)
      alert("Failed to revoke share link")
    }
  }

  const handleReportGenerated = () => {
    setRefreshTrigger((prev) => prev + 1)
    setActiveTab("list")
  }

  const handleViewReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports?id=${reportId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch report")
      }
      const data = await response.json()
      setReportData(data.report.report_data)
      setViewingReportMeta({
        name: data.report.name,
        author_name: data.report.author_name,
        author_email: data.report.author_email,
        created_at: data.report.created_at,
        share_token: data.report.share_token,
        transaction_files: data.report.transaction_files || [],
        nxn_file: data.report.nxn_file,
      })
      setViewingReportId(reportId)
      setActiveTab("view")

      // Fetch share link if token exists
      if (data.report.share_token) {
        const baseUrl = window.location.origin
        setShareUrl(`${baseUrl}/share/${data.report.share_token}`)
      }
    } catch (error) {
      console.error("Failed to load report:", error)
      alert("Failed to load report. Please try again.")
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Transactions Line Item Performance Report</h1>
        <p className="text-muted-foreground mt-2">
          Analyze transaction data to show line item performance by extracting LINEITEMID values
          from impression journeys and aggregating transaction counts and amounts by line item.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Saved Reports</TabsTrigger>
          <TabsTrigger value="create">Create New Report</TabsTrigger>
          <TabsTrigger value="files">Files Library</TabsTrigger>
          {activeTab === "view" && <TabsTrigger value="view">View Report</TabsTrigger>}
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("create")}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Report
            </Button>
          </div>
          <ReportsList onViewReport={handleViewReport} refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <ReportWizard onReportGenerated={handleReportGenerated} />
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <FilesLibrary />
        </TabsContent>

        <TabsContent value="view" className="space-y-4">
          {reportData ? (
            <>
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setActiveTab("list")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Reports
                </Button>
              </div>

              {viewingReportMeta && (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle>{viewingReportMeta.name || "Report"}</CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex items-center gap-4 text-sm">
                              {viewingReportMeta.author_name && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>Author: {viewingReportMeta.author_name}</span>
                                  {viewingReportMeta.author_email && (
                                    <span className="text-muted-foreground">
                                      ({viewingReportMeta.author_email})
                                    </span>
                                  )}
                                </div>
                              )}
                              {viewingReportMeta.created_at && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span className="text-muted-foreground">
                                    Created: {format(new Date(viewingReportMeta.created_at), "MMM d, yyyy 'at' h:mm a")}
                                  </span>
                                </div>
                              )}
                            </div>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {shareUrl ? (
                            <>
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50 max-w-md">
                                  <input
                                    type="text"
                                    readOnly
                                    value={shareUrl}
                                    className="flex-1 bg-transparent text-sm outline-none"
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={handleCopyShareLink}
                                    title="Copy share link"
                                  >
                                    {copied ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Recipients must be logged in to view this report
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRevokeShareLink}
                                title="Revoke share link"
                              >
                                Revoke
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewingReportId && fetchShareLink(viewingReportId)}
                              title="Generate share link"
                            >
                              <Share2 className="mr-2 h-4 w-4" />
                              Share Report
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {((viewingReportMeta.transaction_files?.length ?? 0) > 0 || viewingReportMeta.nxn_file) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Source Files</CardTitle>
                        <CardDescription>
                          Files used to generate this report
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {viewingReportMeta.transaction_files && viewingReportMeta.transaction_files.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Transaction Files ({viewingReportMeta.transaction_files.length})</h4>
                            <div className="space-y-2">
                              {viewingReportMeta.transaction_files.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                                        {file.row_count !== undefined && file.row_count !== null && (
                                          <span>• {file.row_count.toLocaleString()} rows</span>
                                        )}
                                        <span>• {format(new Date(file.created_at), "MMM d, yyyy")}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0"
                                    onClick={() => handleDownloadFile(file.id, file.file_name)}
                                    title="Download file"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {viewingReportMeta.nxn_file && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">NXN Lookup File</h4>
                            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{viewingReportMeta.nxn_file.file_name}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span>{(viewingReportMeta.nxn_file.file_size / 1024).toFixed(1)} KB</span>
                                    {viewingReportMeta.nxn_file.row_count !== undefined && viewingReportMeta.nxn_file.row_count !== null && (
                                      <span>• {viewingReportMeta.nxn_file.row_count.toLocaleString()} rows</span>
                                    )}
                                    <span>• {format(new Date(viewingReportMeta.nxn_file.created_at), "MMM d, yyyy")}</span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => viewingReportMeta.nxn_file && handleDownloadFile(viewingReportMeta.nxn_file.id, viewingReportMeta.nxn_file.file_name)}
                                title="Download file"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

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
                <ExportButtons data={reportData.results} />
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
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No report data available</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("list")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
