"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function OverallSummary() {

  const handleNavigate = (tab: string) => {
    // Update the URL hash to trigger tab change
    window.location.hash = tab
    // Also trigger a custom event that the parent can listen to
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab } }))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">The Observatory</h1>
        <p className="text-muted-foreground mt-2">
          Select a reporting product to view detailed analytics and insights.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
          onClick={() => handleNavigate('line-item')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Dashboard Line Item Performance</CardTitle>
                  <CardDescription className="mt-1">
                    Analyze line item performance metrics and insights
                  </CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View detailed line item performance reports with revenue, ROAS, and transaction data.
              Analyze top performing line items and export insights.
            </p>
            <Button
              variant="outline"
              className="mt-4 group-hover:border-primary group-hover:text-primary"
              onClick={(e) => {
                e.stopPropagation()
                handleNavigate('line-item')
              }}
            >
              View Reports
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
          onClick={() => handleNavigate('creative')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Dashboard Creative Performance</CardTitle>
                  <CardDescription className="mt-1">
                    Track creative performance and optimization metrics
                  </CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Monitor creative performance across campaigns. Analyze creative-level metrics
              and identify top performing assets.
            </p>
            <Button
              variant="outline"
              className="mt-4 group-hover:border-primary group-hover:text-primary"
              onClick={(e) => {
                e.stopPropagation()
                handleNavigate('creative')
              }}
            >
              View Reports
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
