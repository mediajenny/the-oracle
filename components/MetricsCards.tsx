import { Card, CardContent } from "@/components/ui/card"

interface SummaryStats {
  totalLineItems: number
  matchedLineItems: number
  unmatchedLineItems: number
  totalTransactions: number
  totalRevenue: number
  totalSpend: number
  totalNxnSpend: number
  overallRoas: number | null
}

interface MetricsCardsProps {
  summary: SummaryStats
}

export function MetricsCards({ summary }: MetricsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{summary.totalLineItems.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Total Line Items
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ✓ Matched: {summary.matchedLineItems} | ⚠ Unmatched: {summary.unmatchedLineItems}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {summary.totalTransactions.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Total Transactions (Duplicated)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            ${summary.totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Total Revenue (Duplicated)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {(() => {
              const spend = typeof summary.totalSpend === "number"
                ? summary.totalSpend
                : parseFloat(String(summary.totalSpend || 0).replace(/[^0-9.-]/g, "")) || 0
              return `$${spend.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            })()}
          </div>
          <p className="text-xs text-muted-foreground">Total DSP Spend</p>
          {summary.overallRoas && (
            <p className="text-xs text-muted-foreground mt-1">
              Overall Influenced ROAS: {typeof summary.overallRoas === "number"
                ? summary.overallRoas.toFixed(2)
                : parseFloat(String(summary.overallRoas)).toFixed(2)}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
