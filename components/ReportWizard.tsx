"use client"

import { useState, useEffect } from "react"
import { FileUploader } from "@/components/FileUploader"
import { FilesLibrary } from "@/components/FilesLibrary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle, CheckCircle2, Upload, FileCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ReportWizardProps {
  onReportGenerated: () => void
}

export function ReportWizard({ onReportGenerated }: ReportWizardProps) {
  const [selectedTransactionFiles, setSelectedTransactionFiles] = useState<string[]>([])
  const [selectedNxnFile, setSelectedNxnFile] = useState<string>("")
  const [advertiser, setAdvertiser] = useState<string>("")
  const [campaign, setCampaign] = useState<string>("")
  const [openField, setOpenField] = useState<string>("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>("")
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])
  const [activeSection, setActiveSection] = useState<"upload" | "select">("upload")

  // Generate report name based on naming convention: MM.DD.YY_Advertiser_Campaign_Dashboard Line Item Performance Report_(open field)
  const generateReportName = () => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const year = String(now.getFullYear()).slice(-2)
    const dateStr = `${month}.${day}.${year}`

    const parts = [
      dateStr,
      advertiser.trim() || '',
      campaign.trim() || '',
      'Dashboard Line Item Performance Report',
      openField.trim() || ''
    ].filter(part => part !== '')

    return parts.join('_')
  }

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/upload")
      if (!response.ok) {
        throw new Error("Failed to fetch files")
      }
      const data = await response.json()
      setUploadedFiles(data.files || [])
    } catch (err) {
      console.error("Failed to fetch files:", err)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleUploadComplete = (file?: any) => {
    fetchFiles().then(() => {
      // Auto-select newly uploaded files for immediate use
      if (file) {
        if (file.fileType === "transaction") {
          setSelectedTransactionFiles((prev) => {
            if (!prev.includes(file.id)) {
              return [...prev, file.id]
            }
            return prev
          })
        } else if (file.fileType === "nxn_lookup") {
          setSelectedNxnFile(file.id)
        }
      }
    })
  }

  const handleFileSelect = (fileId: string, fileType: string) => {
    if (fileType === "transaction") {
      setSelectedTransactionFiles((prev) => {
        if (prev.includes(fileId)) {
          return prev.filter((id) => id !== fileId)
        } else {
          return [...prev, fileId]
        }
      })
    } else if (fileType === "nxn_lookup") {
      setSelectedNxnFile((prev) => (prev === fileId ? "" : fileId))
    }
  }

  const canProcess = () => {
    return selectedTransactionFiles.length > 0 && selectedNxnFile !== "" && advertiser.trim() !== "" && campaign.trim() !== ""
  }

  const handleProcess = async () => {
    if (!advertiser.trim() || !campaign.trim()) {
      setError("Please enter Advertiser and Campaign")
      return
    }

    if (selectedTransactionFiles.length === 0 || !selectedNxnFile) {
      setError("Please select at least one transaction file and one NXN lookup file")
      return
    }

    setProcessing(true)
    setError("")

    try {
      const reportName = generateReportName()
      const response = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionFileIds: selectedTransactionFiles,
          nxnFileId: selectedNxnFile,
          reportName: reportName,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Processing failed")
      }

      // Success - reset wizard and refresh reports list
      setSelectedTransactionFiles([])
      setSelectedNxnFile("")
      setAdvertiser("")
      setCampaign("")
      setOpenField("")
      setActiveSection("upload")
      onReportGenerated()
    } catch (err: any) {
      setError(err.message || "Failed to process files")
    } finally {
      setProcessing(false)
    }
  }

  const transactionFiles = uploadedFiles.filter((f) => f.fileType === "transaction")
  const nxnFiles = uploadedFiles.filter((f) => f.fileType === "nxn_lookup")
  const hasRequiredFiles = transactionFiles.length > 0 && nxnFiles.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Report</CardTitle>
          <CardDescription>
            Upload files or select from your library, then generate your report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload Files
              </TabsTrigger>
              <TabsTrigger value="select" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Select from Library
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6 mt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Transaction Detail Files</h3>
                  <FileUploader
                    fileType="transaction"
                    onUploadComplete={handleUploadComplete}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">NXN Lookup File</h3>
                  <FileUploader
                    fileType="nxn_lookup"
                    onUploadComplete={handleUploadComplete}
                  />
                </div>
              </div>

              {hasRequiredFiles && (
                <>
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-md">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <p className="text-sm text-green-800">
                      Files uploaded! You can generate a report now or select different files from your library.
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold">Report Name</Label>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">
                          Format: MM.DD.YY_Advertiser_Campaign_Dashboard Line Item Performance Report_(optional)
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="dateField">Date (MM.DD.YY)</Label>
                          <Input
                            id="dateField"
                            value={(() => {
                              const now = new Date()
                              const month = String(now.getMonth() + 1).padStart(2, '0')
                              const day = String(now.getDate()).padStart(2, '0')
                              const year = String(now.getFullYear()).slice(-2)
                              return `${month}.${day}.${year}`
                            })()}
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">
                            Auto-populated from report creation date
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="advertiserUpload">Advertiser *</Label>
                          <Input
                            id="advertiserUpload"
                            placeholder="Enter advertiser name"
                            value={advertiser}
                            onChange={(e) => setAdvertiser(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="campaignUpload">Campaign *</Label>
                          <Input
                            id="campaignUpload"
                            placeholder="Enter campaign name"
                            value={campaign}
                            onChange={(e) => setCampaign(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="openFieldUpload">Additional Info (Optional)</Label>
                          <Input
                            id="openFieldUpload"
                            placeholder="Any additional information"
                            value={openField}
                            onChange={(e) => setOpenField(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="rounded-md bg-muted p-3">
                        <p className="text-xs font-medium mb-1">Preview:</p>
                        <p className="text-sm font-mono text-muted-foreground break-all">
                          {generateReportName()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md bg-muted p-4 space-y-2">
                      <p className="text-sm font-medium">Files to Process:</p>
                      <ul className="text-sm space-y-1">
                        <li className="text-muted-foreground">
                          • {selectedTransactionFiles.length || transactionFiles.length} transaction file(s)
                          {selectedTransactionFiles.length > 0 && (
                            <span className="ml-2 text-xs">
                              ({selectedTransactionFiles.length} selected)
                            </span>
                          )}
                        </li>
                        <li className="text-muted-foreground">
                          • {selectedNxnFile || nxnFiles.length > 0 ? "1" : "0"} NXN lookup file
                          {selectedNxnFile && (
                            <span className="ml-2 text-xs">(selected)</span>
                          )}
                        </li>
                      </ul>
                      {selectedTransactionFiles.length === 0 && transactionFiles.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 All uploaded transaction files will be used. Switch to "Select from Library" to choose specific files.
                        </p>
                      )}
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={async () => {
                        // Use selected files (which are auto-selected on upload) or all uploaded files
                        // Files are already saved with metadata via the upload API
                        const transactionIds = selectedTransactionFiles.length > 0
                          ? selectedTransactionFiles
                          : transactionFiles.map(f => f.id)
                        const nxnId = selectedNxnFile || (nxnFiles.length > 0 ? nxnFiles[0].id : "")

                        if (!nxnId) {
                          setError("Please upload an NXN lookup file")
                          return
                        }

                        if (transactionIds.length === 0) {
                          setError("Please upload at least one transaction file")
                          return
                        }

                        if (!advertiser.trim() || !campaign.trim()) {
                          setError("Please enter Advertiser and Campaign")
                          return
                        }

                        setProcessing(true)
                        setError("")

                        try {
                          // Files are already saved with metadata (row_count, file_size, etc.) via upload API
                          // The process API will link these files to the report
                          const reportName = generateReportName()
                          const response = await fetch("/api/process", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              transactionFileIds: transactionIds,
                              nxnFileId: nxnId,
                              reportName: reportName,
                            }),
                          })

                          if (!response.ok) {
                            const errorData = await response.json()
                            throw new Error(errorData.error || "Processing failed")
                          }

                          // Success - reset wizard and refresh reports list
                          setSelectedTransactionFiles([])
                          setSelectedNxnFile("")
                          setAdvertiser("")
                          setCampaign("")
                          setOpenField("")
                          onReportGenerated()
                        } catch (err: any) {
                          setError(err.message || "Failed to process files")
                        } finally {
                          setProcessing(false)
                        }
                      }}
                      disabled={processing || !advertiser.trim() || !campaign.trim() || !hasRequiredFiles}
                      className="w-full"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Generate Report"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="select" className="space-y-6 mt-6">
              {!hasRequiredFiles ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please upload at least one transaction file and one NXN lookup file first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <FilesLibrary
                    selectMode={true}
                    selectedFileIds={[...selectedTransactionFiles, selectedNxnFile].filter(Boolean)}
                    onFileSelect={handleFileSelect}
                  />

                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold">Report Name</Label>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">
                          Format: MM.DD.YY_Advertiser_Campaign_Dashboard Line Item Performance Report_(optional)
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="dateFieldSelect">Date (MM.DD.YY)</Label>
                          <Input
                            id="dateFieldSelect"
                            value={(() => {
                              const now = new Date()
                              const month = String(now.getMonth() + 1).padStart(2, '0')
                              const day = String(now.getDate()).padStart(2, '0')
                              const year = String(now.getFullYear()).slice(-2)
                              return `${month}.${day}.${year}`
                            })()}
                            disabled
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">
                            Auto-populated from report creation date
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="advertiserSelect">Advertiser *</Label>
                          <Input
                            id="advertiserSelect"
                            placeholder="Enter advertiser name"
                            value={advertiser}
                            onChange={(e) => setAdvertiser(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="campaignSelect">Campaign *</Label>
                          <Input
                            id="campaignSelect"
                            placeholder="Enter campaign name"
                            value={campaign}
                            onChange={(e) => setCampaign(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="openFieldSelect">Additional Info (Optional)</Label>
                          <Input
                            id="openFieldSelect"
                            placeholder="Any additional information"
                            value={openField}
                            onChange={(e) => setOpenField(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="rounded-md bg-muted p-3">
                        <p className="text-xs font-medium mb-1">Preview:</p>
                        <p className="text-sm font-mono text-muted-foreground break-all">
                          {generateReportName()}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md bg-muted p-4 space-y-2">
                      <p className="text-sm font-medium">Selected Files:</p>
                      <ul className="text-sm space-y-1">
                        <li className="text-muted-foreground">
                          • {selectedTransactionFiles.length} transaction file(s)
                        </li>
                        <li className="text-muted-foreground">
                          • {selectedNxnFile ? "1" : "0"} NXN lookup file
                        </li>
                      </ul>
                    </div>

                    {error && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handleProcess}
                      disabled={processing || !canProcess()}
                      className="w-full"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Generate Report"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
