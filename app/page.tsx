"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Image } from "lucide-react"

export default function Home() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">The Observatory</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Campaign performance analysis and reporting tools
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
        <Link href="/reports" className="block">
          <Card className="h-full transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">Dashboard Line Item Performance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                Analyze transaction data to show line item performance by extracting LINEITEMID
                values from impression journeys and aggregating transaction counts and amounts.
              </CardDescription>
              <div className="mt-4 text-sm text-primary font-medium">
                Generate Report →
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Image className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg">Creative Report</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-sm">
              Analyze creative performance metrics including impressions, clicks, and
              conversions across different creative assets and formats.
            </CardDescription>
            <div className="mt-4 text-sm text-muted-foreground font-medium">
              Coming Soon
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
