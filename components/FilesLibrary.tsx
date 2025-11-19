"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, FileText, Trash2, Calendar, Download, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
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

type SortField = "fileName" | "createdAt" | "fileSize" | "rowCount"
type SortOrder = "asc" | "desc"

export function FilesLibrary({ onFileSelect, selectedFileIds = [], selectMode = false }: FilesLibraryProps) {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null)

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all") // "all", "today", "week", "month", "year"
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

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

  const handleDownload = (fileId: string, fileName: string) => {
    const downloadUrl = `/api/upload?id=${fileId}&download=true`
    const link = document.createElement("a")
    link.href = downloadUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  // Filter and sort logic
  const filteredAndSortedFiles = useMemo(() => {
    let filtered = [...files]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((file) =>
        file.fileName.toLowerCase().includes(query)
      )
    }

    // Filter by date
    if (dateFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      filtered = filtered.filter((file) => {
        const fileDate = new Date(file.createdAt)

        switch (dateFilter) {
          case "today":
            return fileDate >= today
          case "week":
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return fileDate >= weekAgo
          case "month":
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return fileDate >= monthAgo
          case "year":
            const yearAgo = new Date(today)
            yearAgo.setFullYear(yearAgo.getFullYear() - 1)
            return fileDate >= yearAgo
          default:
            return true
        }
      })
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortField) {
        case "fileName":
          aVal = a.fileName.toLowerCase()
          bVal = b.fileName.toLowerCase()
          break
        case "createdAt":
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        case "fileSize":
          aVal = a.fileSize
          bVal = b.fileSize
          break
        case "rowCount":
          aVal = a.rowCount ?? 0
          bVal = b.rowCount ?? 0
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [files, searchQuery, dateFilter, sortField, sortOrder])

  const transactionFiles = filteredAndSortedFiles.filter((f) => f.fileType === "transaction")
  const nxnFiles = filteredAndSortedFiles.filter((f) => f.fileType === "nxn_lookup")

  const FileList = ({ files, type }: { files: File[]; type: "transaction" | "nxn_lookup" }) => {
    if (files.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No {type === "transaction" ? "transaction" : "NXN lookup"} files found
        </div>
      )
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectMode && <TableHead className="w-[120px]">Select</TableHead>}
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort("fileName")}
                >
                  File Name
                  {getSortIcon("fileName")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort("rowCount")}
                >
                  Rows
                  {getSortIcon("rowCount")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort("fileSize")}
                >
                  Size
                  {getSortIcon("fileSize")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 -ml-3"
                  onClick={() => handleSort("createdAt")}
                >
                  Upload Date
                  {getSortIcon("createdAt")}
                </Button>
              </TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow
                key={file.id}
                className={selectedFileIds.includes(file.id) ? "bg-primary/5" : ""}
              >
                {selectMode && (
                  <TableCell>
                    <Button
                      variant={selectedFileIds.includes(file.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => onFileSelect?.(file.id, file.fileType)}
                    >
                      {selectedFileIds.includes(file.id) ? "Selected" : "Select"}
                    </Button>
                  </TableCell>
                )}
                <TableCell>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{file.fileName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {file.rowCount !== undefined && file.rowCount !== null
                    ? file.rowCount.toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(file.createdAt), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(file.id, file.fileName)}
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!selectMode && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setFileToDelete(file.id)}
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Files Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your uploaded files. Files are saved with all metadata for reuse.
          </p>
        </div>

      {/* Filter and Search Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filter & Sort</CardTitle>
          <CardDescription>Filter files by date, search by name, and sort columns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
      </div>

            {/* Date Filter */}
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Results Count */}
            <div className="flex items-center justify-end text-sm text-muted-foreground">
              Showing {filteredAndSortedFiles.length} of {files.length} files
                        </div>
                      </div>
                    </CardContent>
                  </Card>

      {/* Transaction Reports Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Transaction Reports</h3>
            <p className="text-sm text-muted-foreground">
              {transactionFiles.length} file{transactionFiles.length !== 1 ? "s" : ""}
            </p>
                            </div>
                          </div>
        <FileList files={transactionFiles} type="transaction" />
                        </div>

      {/* NXN Lookup Reports Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">NXN Lookup Reports</h3>
            <p className="text-sm text-muted-foreground">
              {nxnFiles.length} file{nxnFiles.length !== 1 ? "s" : ""}
            </p>
                        </div>
                      </div>
        <FileList files={nxnFiles} type="nxn_lookup" />
            </div>

      {/* Delete Confirmation Dialog */}
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
