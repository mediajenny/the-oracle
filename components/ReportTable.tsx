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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

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

const COLUMN_CONFIG = [
  { key: "Advertiser Name", label: "Advertiser", searchable: true, defaultVisible: true },
  { key: "Insertion Order ID", label: "IO ID", searchable: true, defaultVisible: true },
  { key: "Insertion Order Name", label: "IO Name", searchable: true, defaultVisible: true },
  { key: "Package ID", label: "Package ID", searchable: true, defaultVisible: false },
  { key: "Package Name", label: "Package Name", searchable: true, defaultVisible: false },
  { key: "LINEITEMID", label: "Line Item ID", searchable: true, defaultVisible: true },
  { key: "NXN Line Item Name", label: "Line Item Name", searchable: true, defaultVisible: true },
  { key: "Unique Transaction Count", label: "Transactions", searchable: false, defaultVisible: true },
  { key: "Total Transaction Amount", label: "Revenue", searchable: false, defaultVisible: true },
  { key: "NXN Impressions", label: "Impressions", searchable: false, defaultVisible: true },
  { key: "NXN Spend", label: "Spend", searchable: false, defaultVisible: true },
  { key: "Influenced ROAS (Not Deduplicated)", label: "Influenced ROAS", searchable: false, defaultVisible: true },
  { key: "Transaction IDs", label: "Transaction IDs", searchable: true, defaultVisible: false },
] as const

const ITEMS_PER_PAGE = 50

export function ReportTable({ data }: ReportTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [insertionOrderFilter, setInsertionOrderFilter] = useState<string[]>([])
  const [advertiserFilter, setAdvertiserFilter] = useState<string[]>([])
  const [sortColumn, setSortColumn] = useState<string>("Total Transaction Amount")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(COLUMN_CONFIG.filter(col => col.defaultVisible).map(col => col.key))
  )
  const [showFilters, setShowFilters] = useState(false)

  // Get unique values for filters
  const uniqueInsertionOrders = useMemo(() => {
    const orders = new Set<string>()
    data.forEach((row) => {
      if (row["Insertion Order Name"]) {
        orders.add(row["Insertion Order Name"])
      }
    })
    return Array.from(orders).sort()
  }, [data])

  const uniqueAdvertisers = useMemo(() => {
    const advertisers = new Set<string>()
    data.forEach((row) => {
      if (row["Advertiser Name"]) {
        advertisers.add(row["Advertiser Name"])
      }
    })
    return Array.from(advertisers).sort()
  }, [data])

  // Search across all searchable columns
  const searchInRow = (row: ProcessedLineItem, term: string): boolean => {
    if (!term) return true
    
    const searchLower = term.toLowerCase()
    
    // Search in all searchable columns
    return COLUMN_CONFIG.some(col => {
      if (!col.searchable) return false
      const value = row[col.key as keyof ProcessedLineItem]
      if (value === undefined || value === null) return false
      return String(value).toLowerCase().includes(searchLower)
    })
  }

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

    // Filter by advertiser
    if (advertiserFilter.length > 0) {
      filtered = filtered.filter(
        (row) =>
          row["Advertiser Name"] &&
          advertiserFilter.includes(row["Advertiser Name"])
      )
    }

    // Search across all columns
    if (searchTerm) {
      filtered = filtered.filter((row) => searchInRow(row, searchTerm))
    }

    return filtered
  }, [data, insertionOrderFilter, advertiserFilter, searchTerm])

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

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedData.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedData, currentPage])

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
    setCurrentPage(1) // Reset to first page on sort
  }

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const visibleColumnsList = COLUMN_CONFIG.filter(col => visibleColumns.has(col.key))

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filter & Search</CardTitle>
              <CardDescription>
                Search across all columns, filter by insertion order or advertiser
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Hide" : "Show"} Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search across all columns..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              {/* Insertion Order Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Insertion Orders</label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="io-all"
                      checked={insertionOrderFilter.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setInsertionOrderFilter([])
                        } else {
                          setInsertionOrderFilter(uniqueInsertionOrders)
                        }
                      }}
                    />
                    <label htmlFor="io-all" className="text-sm cursor-pointer">
                      All ({uniqueInsertionOrders.length})
                    </label>
                  </div>
                  {uniqueInsertionOrders.map((order) => (
                    <div key={order} className="flex items-center gap-2">
                      <Checkbox
                        id={`io-${order}`}
                        checked={insertionOrderFilter.includes(order)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setInsertionOrderFilter([...insertionOrderFilter, order])
                          } else {
                            setInsertionOrderFilter(
                              insertionOrderFilter.filter((o) => o !== order)
                            )
                          }
                        }}
                      />
                      <label htmlFor={`io-${order}`} className="text-sm cursor-pointer truncate">
                        {order}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advertiser Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Advertisers</label>
                <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="adv-all"
                      checked={advertiserFilter.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setAdvertiserFilter([])
                        } else {
                          setAdvertiserFilter(uniqueAdvertisers)
                        }
                      }}
                    />
                    <label htmlFor="adv-all" className="text-sm cursor-pointer">
                      All ({uniqueAdvertisers.length})
                    </label>
                  </div>
                  {uniqueAdvertisers.map((advertiser) => (
                    <div key={advertiser} className="flex items-center gap-2">
                      <Checkbox
                        id={`adv-${advertiser}`}
                        checked={advertiserFilter.includes(advertiser)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAdvertiserFilter([...advertiserFilter, advertiser])
                          } else {
                            setAdvertiserFilter(
                              advertiserFilter.filter((a) => a !== advertiser)
                            )
                          }
                        }}
                      />
                      <label htmlFor={`adv-${advertiser}`} className="text-sm cursor-pointer truncate">
                        {advertiser}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(insertionOrderFilter.length > 0 || advertiserFilter.length > 0 || searchTerm) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchTerm}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setSearchTerm("")}
                  />
                </Badge>
              )}
              {insertionOrderFilter.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  IO: {insertionOrderFilter.length} selected
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setInsertionOrderFilter([])}
                  />
                </Badge>
              )}
              {advertiserFilter.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Advertisers: {advertiserFilter.length} selected
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setAdvertiserFilter([])}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals Section */}
      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Line Items</div>
              <div className="text-lg font-semibold">{sortedData.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Transactions (Duplicated)</div>
              <div className="text-lg font-semibold">{formatNumber(totals["Unique Transaction Count"])}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Revenue (Duplicated)</div>
              <div className="text-lg font-semibold">{formatCurrency(totals["Total Transaction Amount"])}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Impressions</div>
              <div className="text-lg font-semibold">{formatNumber(totals["NXN Impressions"])}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Spend</div>
              <div className="text-lg font-semibold">{formatCurrency(totals["NXN Spend"])}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Overall Influenced ROAS</div>
              <div className="text-lg font-semibold">
                {overallRoas ? overallRoas.toFixed(2) : "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Visibility */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Line Item Performance</CardTitle>
              <CardDescription>
                Showing {paginatedData.length} of {sortedData.length} records
                {sortedData.length !== data.length && ` (filtered from ${data.length} total)`}
              </CardDescription>
            </div>
            <Select
              value={sortColumn}
              onValueChange={(value) => {
                setSortColumn(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLUMN_CONFIG.filter(col => col.key !== "Transaction IDs").map((col) => (
                  <SelectItem key={col.key} value={col.key}>
                    Sort by {col.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Column Visibility Toggle */}
          <div className="mb-4 p-3 bg-muted rounded-md">
            <div className="text-sm font-medium mb-2">Visible Columns:</div>
            <div className="flex flex-wrap gap-2">
              {COLUMN_CONFIG.map((col) => (
                <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={visibleColumns.has(col.key)}
                    onCheckedChange={(checked) => {
                      const newVisible = new Set(visibleColumns)
                      if (checked) {
                        newVisible.add(col.key)
                      } else {
                        newVisible.delete(col.key)
                      }
                      setVisibleColumns(newVisible)
                    }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumnsList.map((col) => (
                    <TableHead
                      key={col.key}
                      className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        {getSortIcon(col.key)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={visibleColumnsList.length} className="text-center py-8 text-muted-foreground">
                      No data found. Try adjusting your filters or search term.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {paginatedData.map((row, idx) => (
                      <TableRow key={`${row.LINEITEMID}-${idx}`} className="hover:bg-muted/50">
                        {visibleColumnsList.map((col) => {
                          const value = row[col.key as keyof ProcessedLineItem]
                          let displayValue: string = ""

                          if (value === undefined || value === null) {
                            displayValue = ""
                          } else if (col.key === "Total Transaction Amount" || col.key === "NXN Spend") {
                            displayValue = formatCurrency(value as number)
                          } else if (col.key === "NXN Impressions" || col.key === "Unique Transaction Count") {
                            displayValue = formatNumber(value as number)
                          } else if (col.key === "Influenced ROAS (Not Deduplicated)") {
                            displayValue = value ? (value as number).toFixed(2) : ""
                          } else if (col.key === "Match Status") {
                            displayValue = value as string
                          } else {
                            displayValue = String(value)
                          }

                          return (
                            <TableCell key={col.key} className="whitespace-nowrap">
                              {col.key === "Match Status" ? (
                                <Badge variant={value === "Matched" ? "default" : "destructive"}>
                                  {displayValue}
                                </Badge>
                              ) : (
                                displayValue
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted font-bold">
                      {(() => {
                        const numericCols = ["Unique Transaction Count", "Total Transaction Amount", "NXN Impressions", "NXN Spend", "Influenced ROAS (Not Deduplicated)"]
                        const cells: React.ReactNode[] = []
                        let totalsRendered = false
                        
                        visibleColumnsList.forEach((col, idx) => {
                          const isNumeric = numericCols.includes(col.key)
                          
                          // Render "Totals" label spanning all non-numeric columns before first numeric
                          if (!totalsRendered) {
                            const firstNumericIdx = visibleColumnsList.findIndex(c => numericCols.includes(c.key))
                            const nonNumericBeforeFirst = firstNumericIdx >= 0 ? firstNumericIdx : visibleColumnsList.filter(c => !numericCols.includes(c.key)).length
                            
                            if (nonNumericBeforeFirst > 0 && idx === 0) {
                              cells.push(
                                <TableCell key="totals-label" colSpan={nonNumericBeforeFirst}>
                                  Totals
                                </TableCell>
                              )
                              totalsRendered = true
                              return // Skip processing this column
                            } else if (nonNumericBeforeFirst === 0 && idx === 0) {
                              // First column is numeric
                              cells.push(<TableCell key="totals-label">Totals</TableCell>)
                              totalsRendered = true
                            }
                          }
                          
                          // Skip non-numeric columns (covered by colspan)
                          if (!isNumeric) {
                            return
                          }
                          
                          // Render totals for numeric columns
                          if (col.key === "Unique Transaction Count") {
                            cells.push(
                              <TableCell key={col.key}>
                                {formatNumber(totals["Unique Transaction Count"])}
                              </TableCell>
                            )
                          } else if (col.key === "Total Transaction Amount") {
                            cells.push(
                              <TableCell key={col.key}>
                                {formatCurrency(totals["Total Transaction Amount"])}
                              </TableCell>
                            )
                          } else if (col.key === "NXN Impressions") {
                            cells.push(
                              <TableCell key={col.key}>
                                {formatNumber(totals["NXN Impressions"])}
                              </TableCell>
                            )
                          } else if (col.key === "NXN Spend") {
                            cells.push(
                              <TableCell key={col.key}>
                                {formatCurrency(totals["NXN Spend"])}
                              </TableCell>
                            )
                          } else if (col.key === "Influenced ROAS (Not Deduplicated)") {
                            cells.push(
                              <TableCell key={col.key}>
                                {overallRoas ? overallRoas.toFixed(2) : ""}
                              </TableCell>
                            )
                          } else {
                            cells.push(<TableCell key={col.key}></TableCell>)
                          }
                        })
                        
                        return cells
                      })()}
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
