"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { MetricsCards } from "@/components/MetricsCards"
import { ReportTable } from "@/components/ReportTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, User, Calendar, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExportButtons } from "@/components/ExportButtons"
import type { ProcessedLineItem } from "@/components/ReportTable"
import { format } from "date-fns"

interface ReportData {
  results: ProcessedLineItem[]
  unmatchedNxn: any[]
  summary: any
  revenueByFile: any[]
}

interface ReportMeta {
  name?: string
  author_name?: string
  author_email?: string
  created_at?: string
}

export default function SharedReportPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const token = params.token as string
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportMeta, setReportMeta] = useState<ReportMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/share/${token}`)}`)
      return
    }

    if (status === "loading" || !session) {
      return
    }

    const fetchSharedReport = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/share/report?token=${token}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to load report")
        }

        const data = await response.json()
        setReportData(data.report.report_data)
        setReportMeta({
          name: data.report.name,
          author_name: data.report.author_name,
          author_email: data.report.author_email,
          created_at: data.report.created_at,
        })
      } catch (err: any) {
        setError(err.message || "Failed to load shared report")
      } finally {
        setLoading(false)
      }
    }

    if (token && session) {
      fetchSharedReport()
    }
  }, [token, session, status, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!reportData) {
    return null
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Shared Report</h1>
        <p className="text-muted-foreground mt-2">
          This report has been shared with you. You must be logged in to view shared reports.
        </p>
      </div>

      {reportMeta && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{reportMeta.name || "Report"}</CardTitle>
                <CardDescription className="mt-2">
                  <div className="flex items-center gap-4 text-sm">
                    {reportMeta.author_name && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Author: {reportMeta.author_name}</span>
                        {reportMeta.author_email && (
                          <span className="text-muted-foreground">
                            ({reportMeta.author_email})
                          </span>
                        )}
                      </div>
                    )}
                    {reportMeta.created_at && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-muted-foreground">
                          Created: {format(new Date(reportMeta.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    )}
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
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
    </div>
  )
}

