"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Trash2, Eye, Calendar, User } from "lucide-react"
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

interface Report {
  id: string
  name: string
  report_type?: string
  created_at: string
  updated_at: string
  total_line_items?: string
  total_transactions?: string
  total_revenue?: string
  transaction_file_count?: number
  author_name?: string
  author_email?: string
}

const REPORT_TYPE_LABELS: Record<string, string> = {
  dashboard_line_item_performance: "Line Item Performance",
  creative: "Creative Report",
}

interface ReportsListProps {
  onViewReport: (reportId: string) => void
  refreshTrigger?: number
}

export function ReportsList({ onViewReport, refreshTrigger }: ReportsListProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<string | null>(null)

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/reports")
      if (!response.ok) {
        throw new Error("Failed to fetch reports")
      }
      const data = await response.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [refreshTrigger])

  const handleDelete = async (reportId: string) => {
    try {
      setDeletingId(reportId)
      const response = await fetch(`/api/reports?id=${reportId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete report")
      }

      await fetchReports()
      setDeleteDialogOpen(false)
      setReportToDelete(null)
    } catch (error) {
      console.error("Failed to delete report:", error)
      alert("Failed to delete report. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const formatCurrency = (value: string | null | undefined) => {
    if (!value) return "N/A"
    const num = parseFloat(value)
    if (isNaN(num)) return "N/A"
    return `$${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatNumber = (value: string | null | undefined) => {
    if (!value) return "N/A"
    const num = parseFloat(value)
    if (isNaN(num)) return "N/A"
    return num.toLocaleString()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>No reports yet. Create your first report using the wizard above.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Saved Reports</CardTitle>
          <CardDescription>
            View and manage your generated reports ({reports.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">{report.name}</h3>
                    {report.report_type && (
                      <Badge variant="outline" className="text-xs">
                        {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                    {report.author_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs">{report.author_name}</span>
                      </div>
                    )}
                    {report.transaction_file_count !== undefined && report.transaction_file_count > 0 && (
                      <Badge variant="secondary">
                        {report.transaction_file_count} file{report.transaction_file_count !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {report.total_line_items && (
                      <span className="text-xs">
                        {formatNumber(report.total_line_items)} line items
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    {report.total_transactions && (
                      <span>{formatNumber(report.total_transactions)} transactions</span>
                    )}
                    {report.total_revenue && (
                      <span>{formatCurrency(report.total_revenue)} revenue</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewReport(report.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReportToDelete(report.id)
                      setDeleteDialogOpen(true)
                    }}
                    disabled={deletingId === report.id}
                  >
                    {deletingId === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the report and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && handleDelete(reportToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
