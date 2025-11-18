"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ProcessedLineItem {
  LINEITEMID: string
  "Unique Transaction Count": number
  "Transaction IDs": string
  "Total Transaction Amount": number
  "NXN Line Item Name"?: string
  "Advertiser Name"?: string
  "Insertion Order ID"?: string
  "Insertion Order Name"?: string
  "Package ID"?: string
  "Package Name"?: string
  "NXN Impressions"?: number
  "NXN Spend"?: number
  "Influenced ROAS (Not Deduplicated)"?: number
  "Match Status": "Matched" | "No Match Found"
}

interface ReportTableProps {
  data: ProcessedLineItem[]
}

export function ReportTable({ data }: ReportTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [insertionOrderFilter, setInsertionOrderFilter] = useState<string[]>([])
  const [sortColumn, setSortColumn] = useState<string>("Total Transaction Amount")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Get unique insertion orders
  const uniqueInsertionOrders = useMemo(() => {
    const orders = new Set<string>()
    data.forEach((row) => {
      if (row["Insertion Order Name"]) {
        orders.add(row["Insertion Order Name"])
      }
    })
    return Array.from(orders).sort()
  }, [data])

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Filter by insertion order
    if (insertionOrderFilter.length > 0) {
      filtered = filtered.filter(
        (row) =>
          row["Insertion Order Name"] &&
          insertionOrderFilter.includes(row["Insertion Order Name"])
      )
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (row) =>
          row.LINEITEMID.toLowerCase().includes(term) ||
          (row["NXN Line Item Name"] &&
            row["NXN Line Item Name"].toLowerCase().includes(term))
      )
    }

    return filtered
  }, [data, insertionOrderFilter, searchTerm])

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData]
    sorted.sort((a, b) => {
      const aVal = a[sortColumn as keyof ProcessedLineItem]
      const bVal = b[sortColumn as keyof ProcessedLineItem]

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal)
      const bStr = String(bVal)
      return sortOrder === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })

    return sorted
  }, [filteredData, sortColumn, sortOrder])

  // Calculate totals
  const totals = useMemo(() => {
    return {
      "Unique Transaction Count": sortedData.reduce(
        (sum, row) => sum + row["Unique Transaction Count"],
        0
      ),
      "Total Transaction Amount": sortedData.reduce(
        (sum, row) => sum + row["Total Transaction Amount"],
        0
      ),
      "NXN Impressions": sortedData.reduce(
        (sum, row) => sum + (row["NXN Impressions"] || 0),
        0
      ),
      "NXN Spend": sortedData.reduce(
        (sum, row) => sum + (row["NXN Spend"] || 0),
        0
      ),
    }
  }, [sortedData])

  const overallRoas =
    totals["NXN Spend"] > 0
      ? totals["Total Transaction Amount"] / totals["NXN Spend"]
      : null

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatNumber = (value: number) => {
    return value.toLocaleString()
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortOrder("desc")
    }
  }

  const columns = [
    "Advertiser Name",
    "Insertion Order ID",
    "Insertion Order Name",
    "Package ID",
    "Package Name",
    "LINEITEMID",
    "NXN Line Item Name",
    "Unique Transaction Count",
    "Total Transaction Amount",
    "NXN Impressions",
    "NXN Spend",
    "Influenced ROAS (Not Deduplicated)",
  ]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filter Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Insertion Order Name</label>
              <Select
                value={insertionOrderFilter.length === 0 ? "all" : "selected"}
                onValueChange={(value) => {
                  if (value === "all") {
                    setInsertionOrderFilter([])
                  } else {
                    setInsertionOrderFilter(uniqueInsertionOrders)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select insertion orders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="selected">Selected ({insertionOrderFilter.length})</SelectItem>
                </SelectContent>
              </Select>
              {insertionOrderFilter.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uniqueInsertionOrders.map((order) => (
                    <label key={order} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={insertionOrderFilter.includes(order)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInsertionOrderFilter([...insertionOrderFilter, order])
                          } else {
                            setInsertionOrderFilter(
                              insertionOrderFilter.filter((o) => o !== order)
                            )
                          }
                        }}
                      />
                      {order}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Search LINEITEMID or Name
              </label>
              <Input
                placeholder="Enter search term..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <Select value={sortColumn} onValueChange={setSortColumn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unique Transaction Count">
                    Unique Transaction Count
                  </SelectItem>
                  <SelectItem value="Total Transaction Amount">
                    Total Transaction Amount
                  </SelectItem>
                  <SelectItem value="NXN Spend">NXN Spend</SelectItem>
                  <SelectItem value="Influenced ROAS (Not Deduplicated)">
                    Influenced ROAS (Not Deduplicated)
                  </SelectItem>
                  <SelectItem value="LINEITEMID">LINEITEMID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Order</label>
              <Select
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as "asc" | "desc")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Line Item Performance ({sortedData.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="cursor-pointer" onClick={() => handleSort(col)}>
                      <div className="flex items-center gap-2">
                        {col}
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, idx) => (
                  <TableRow key={`${row.LINEITEMID}-${idx}`}>
                    {columns.map((col) => {
                      const value = row[col as keyof ProcessedLineItem]
                      let displayValue: string = ""

                      if (value === undefined || value === null) {
                        displayValue = ""
                      } else if (col === "Total Transaction Amount" || col === "NXN Spend") {
                        displayValue = formatCurrency(value as number)
                      } else if (col === "NXN Impressions") {
                        displayValue = formatNumber(value as number)
                      } else if (col === "Influenced ROAS (Not Deduplicated)") {
                        displayValue = value ? (value as number).toFixed(2) : ""
                      } else {
                        displayValue = String(value)
                      }

                      return <TableCell key={col}>{displayValue}</TableCell>
                    })}
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted font-bold">
                  <TableCell colSpan={7}>Totals</TableCell>
                  <TableCell>{formatNumber(totals["Unique Transaction Count"])}</TableCell>
                  <TableCell>{formatCurrency(totals["Total Transaction Amount"])}</TableCell>
                  <TableCell>{formatNumber(totals["NXN Impressions"])}</TableCell>
                  <TableCell>{formatCurrency(totals["NXN Spend"])}</TableCell>
                  <TableCell>
                    {overallRoas ? overallRoas.toFixed(2) : ""}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

