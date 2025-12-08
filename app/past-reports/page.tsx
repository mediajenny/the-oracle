"use client"

import { useState } from "react"
import { ReportsList } from "@/components/ReportsList"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PastReportsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleViewReport = (reportId: string) => {
    // For now, just log - could navigate to a detail page or open a modal
    console.log("View report:", reportId)
    // TODO: Implement report viewing - could open modal or navigate to /past-reports/[id]
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/reports">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Reports
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Past Reports</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your previously saved reports
          </p>
        </div>
        <Link href="/reports">
          <Button>Create New Report</Button>
        </Link>
      </div>

      <ReportsList
        onViewReport={handleViewReport}
        refreshTrigger={refreshTrigger}
      />
    </div>
  )
}
