"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">The Oracle</h1>
          <p className="mt-4 text-xl text-muted-foreground">
            Campaign Performance Analysis Tool
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Line Item Performance</CardTitle>
              <CardDescription>
                Analyze transaction data to show line item performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/reports">
                <Button className="w-full">
                  View Reports
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Creative Report</CardTitle>
              <CardDescription>
                Analyze creative performance metrics (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
