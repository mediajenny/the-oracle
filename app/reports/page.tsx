"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { FileUploader } from "@/components/FileUploader"
import { MetricsCards } from "@/components/MetricsCards"
import { ReportTable } from "@/components/ReportTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, FileText, AlertCircle } from "lucide-react"
import { ExportButtons } from "@/components/ExportButtons"
import type { ProcessedLineItem } from "@/components/ReportTable"

interface UploadedFile {
  id: string
  fileName: string
  fileType: string
  blobUrl: string
  fileSize: number
  createdAt: string
}

interface ReportData {
  results: ProcessedLineItem[]
  unmatchedNxn: any[]
  summary: any
  revenueByFile: any[]
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [transactionFiles, setTransactionFiles] = useState<UploadedFile[]>([])
  const [nxnFiles, setNxnFiles] = useState<UploadedFile[]>([])
  const [selectedTransactionFiles, setSelectedTransactionFiles] = useState<string[]>([])
  const [selectedNxnFile, setSelectedNxnFile] = useState<string>("")
  const [processing, setProcessing] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchFiles()
    }
  }, [session])

  const fetchFiles = async () => {
    try {
      const [transactionRes, nxnRes] = await Promise.all([
        fetch("/api/upload?fileType=transaction"),
        fetch("/api/upload?fileType=nxn_lookup"),
      ])

      const transactionData = await transactionRes.json()
      const nxnData = await nxnRes.json()

      setTransactionFiles(transactionData.files || [])
      setNxnFiles(nxnData.files || [])
    } catch (err) {
      console.error("Failed to fetch files:", err)
    }
  }

  const handleProcess = async () => {
    if (selectedTransactionFiles.length === 0 || !selectedNxnFile) {
      setError("Please select at least one transaction file and one NXN lookup file")
      return
    }

    setProcessing(true)
    setError("")

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionFileIds: selectedTransactionFiles,
          nxnFileId: selectedNxnFile,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Processing failed")
      }

      const data = await response.json()
      setReportData(data.report)
    } catch (err: any) {
      setError(err.message || "Failed to process files")
    } finally {
      setProcessing(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Transactions Line Item Performance Report</h1>
        <p className="text-muted-foreground mt-2">
          Analyze transaction data to show line item performance by extracting LINEITEMID values
          from impression journeys and aggregating transaction counts and amounts by line item.
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">1. Upload Files</TabsTrigger>
          <TabsTrigger value="process" disabled={transactionFiles.length === 0 || nxnFiles.length === 0}>
            2. Process Data
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!reportData}>
            3. Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Detail Files</CardTitle>
                <CardDescription>
                  Upload one or more Dashboard Transaction Events files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader
                  fileType="transaction"
                  onUploadComplete={() => fetchFiles()}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>NXN Lookup File</CardTitle>
                <CardDescription>
                  Upload Line Item Lookup file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FileUploader
                  fileType="nxn_lookup"
                  onUploadComplete={() => fetchFiles()}
                />
              </CardContent>
            </Card>
          </div>

          {transactionFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Transaction Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {transactionFiles.map((file) => (
                    <label key={file.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted">
                      <input
                        type="checkbox"
                        checked={selectedTransactionFiles.includes(file.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransactionFiles([...selectedTransactionFiles, file.id])
                          } else {
                            setSelectedTransactionFiles(
                              selectedTransactionFiles.filter((id) => id !== file.id)
                            )
                          }
                        }}
                      />
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{file.fileName}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {nxnFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Select NXN Lookup File</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {nxnFiles.map((file) => (
                    <label key={file.id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted">
                      <input
                        type="radio"
                        name="nxnFile"
                        checked={selectedNxnFile === file.id}
                        onChange={() => setSelectedNxnFile(file.id)}
                      />
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{file.fileName}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="process" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Process Data</CardTitle>
              <CardDescription>
                Analyze line item performance from selected files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Selected Transaction Files: {selectedTransactionFiles.length}
                </p>
                <p className="text-sm font-medium">
                  Selected NXN File: {selectedNxnFile ? "Yes" : "No"}
                </p>
              </div>

              <Button
                onClick={handleProcess}
                disabled={processing || selectedTransactionFiles.length === 0 || !selectedNxnFile}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Analyze Line Item Performance"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {reportData && (
            <>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-800">
                    💡 Use summary metrics internally only, do not report these to the client since
                    these are showing total duplicated revenue and transaction impact. These are not
                    deduplicated transactions.
                  </p>
                </CardContent>
              </Card>

              <MetricsCards summary={reportData.summary} />

              <div className="flex justify-end">
                <ExportButtons data={reportData.results} />
              </div>

              <ReportTable data={reportData.results} />

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
                            <th className="p-2 text-left">NXN Spend</th>
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

