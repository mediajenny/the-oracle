"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"
import { OverallSummary } from "@/components/OverallSummary"
import { LineItemPerformanceReport } from "@/components/LineItemPerformanceReport"
import { CreativePerformanceReport } from "@/components/CreativePerformanceReport"

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("overview")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const handleNavigateToTab = (event: CustomEvent) => {
      const tab = event.detail?.tab
      if (tab && ['line-item', 'creative'].includes(tab)) {
        setActiveTab(tab)
      }
    }

    window.addEventListener('navigateToTab', handleNavigateToTab as EventListener)
    return () => {
      window.removeEventListener('navigateToTab', handleNavigateToTab as EventListener)
    }
  }, [])

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
    <div className="container mx-auto py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">The Observatory</TabsTrigger>
          <TabsTrigger value="line-item" className="text-xs sm:text-sm">Line Item Performance</TabsTrigger>
          <TabsTrigger value="creative" className="text-xs sm:text-sm">Creative Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverallSummary />
        </TabsContent>

        <TabsContent value="line-item" className="space-y-4">
          <LineItemPerformanceReport />
        </TabsContent>

        <TabsContent value="creative" className="space-y-4">
          <CreativePerformanceReport />
        </TabsContent>
      </Tabs>
    </div>
  )
}
