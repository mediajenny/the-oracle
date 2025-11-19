"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Trash2, Calendar, Download, Filter } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"

interface File {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  rowCount?: number
  createdAt: string
}

interface FilesLibraryProps {
  onFileSelect?: (fileId: string, fileType: string) => void
  selectedFileIds?: string[]
  selectMode?: boolean
}

export function FilesLibrary({ onFileSelect, selectedFileIds = [], selectMode = false }: FilesLibraryProps) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<"all" | "transaction" | "nxn_lookup">("all")
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/upload")
      if (!response.ok) {
        throw new Error("Failed to fetch files")
      }
      const data = await response.json()
      setFiles(data.files || [])
    } catch (error) {
      console.error("Failed to fetch files:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/upload?id=${fileId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error("Delete failed")
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      setFileToDelete(null)
    } catch (error) {
      console.error("Failed to delete file:", error)
      alert("Failed to delete file")
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const filteredFiles = filterType === "all" 
    ? files 
    : files.filter((f) => f.fileType === filterType)

  const transactionFiles = filteredFiles.filter((f) => f.fileType === "transaction")
  const nxnFiles = filteredFiles.filter((f) => f.fileType === "nxn_lookup")

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Files Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your uploaded files. Files are saved with all metadata for reuse.
          </p>
        </div>
        {!selectMode && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="all">All Files</option>
              <option value="transaction">Transaction Files</option>
              <option value="nxn_lookup">NXN Lookup Files</option>
            </select>
          </div>
        )}
      </div>

      {selectMode ? (
        <Tabs defaultValue="transaction" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transaction">
              Transaction Files ({transactionFiles.length})
            </TabsTrigger>
            <TabsTrigger value="nxn_lookup">
              NXN Lookup Files ({nxnFiles.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transaction" className="space-y-2">
            {transactionFiles.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No transaction files uploaded yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {transactionFiles.map((file) => (
                  <Card
                    key={file.id}
                    className={`cursor-pointer transition-colors ${
                      selectedFileIds.includes(file.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => onFileSelect?.(file.id, file.fileType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.fileName}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{formatFileSize(file.fileSize)}</span>
                              {file.rowCount !== undefined && file.rowCount !== null && (
                                <span>• {file.rowCount.toLocaleString()} rows</span>
                              )}
                              <span>• {format(new Date(file.createdAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                        {selectedFileIds.includes(file.id) && (
                          <Badge variant="default" className="ml-2">Selected</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="nxn_lookup" className="space-y-2">
            {nxnFiles.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No NXN lookup files uploaded yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {nxnFiles.map((file) => (
                  <Card
                    key={file.id}
                    className={`cursor-pointer transition-colors ${
                      selectedFileIds.includes(file.id)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => onFileSelect?.(file.id, file.fileType)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{file.fileName}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{formatFileSize(file.fileSize)}</span>
                              {file.rowCount !== undefined && file.rowCount !== null && (
                                <span>• {file.rowCount.toLocaleString()} rows</span>
                              )}
                              <span>• {format(new Date(file.createdAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                        {selectedFileIds.includes(file.id) && (
                          <Badge variant="default" className="ml-2">Selected</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {filteredFiles.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center py-4">
                  No files uploaded yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map((file) => (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm truncate">{file.fileName}</CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {file.fileType === "transaction" ? "Transaction" : "NXN Lookup"}
                            </Badge>
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => setFileToDelete(file.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(file.createdAt), "MMM d, yyyy")}
                      </div>
                      <span>{formatFileSize(file.fileSize)}</span>
                    </div>
                    {file.rowCount !== undefined && file.rowCount !== null && (
                      <div className="text-xs text-muted-foreground">
                        {file.rowCount.toLocaleString()} rows
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AlertDialog open={fileToDelete !== null} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
              Any reports using this file will still work, but you won't be able to access the file directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && handleDelete(fileToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

