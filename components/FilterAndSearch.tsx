"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, X } from "lucide-react"
import type { ProcessedLineItem } from "@/components/ReportTable"

interface FilterAndSearchProps {
  data: ProcessedLineItem[]
  searchTerm: string
  onSearchChange: (value: string) => void
  insertionOrderFilter: string[]
  onInsertionOrderFilterChange: (value: string[]) => void
  advertiserFilter: string[]
  onAdvertiserFilterChange: (value: string[]) => void
}

export function FilterAndSearch({
  data,
  searchTerm,
  onSearchChange,
  insertionOrderFilter,
  onInsertionOrderFilterChange,
  advertiserFilter,
  onAdvertiserFilterChange,
}: FilterAndSearchProps) {
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

  return (
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
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => onSearchChange("")}
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
                        onInsertionOrderFilterChange([])
                      } else {
                        onInsertionOrderFilterChange(uniqueInsertionOrders)
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
                          onInsertionOrderFilterChange([...insertionOrderFilter, order])
                        } else {
                          onInsertionOrderFilterChange(
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
                        onAdvertiserFilterChange([])
                      } else {
                        onAdvertiserFilterChange(uniqueAdvertisers)
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
                          onAdvertiserFilterChange([...advertiserFilter, advertiser])
                        } else {
                          onAdvertiserFilterChange(
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
                  onClick={() => onSearchChange("")}
                />
              </Badge>
            )}
            {insertionOrderFilter.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                IO: {insertionOrderFilter.length} selected
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onInsertionOrderFilterChange([])}
                />
              </Badge>
            )}
            {advertiserFilter.length > 0 && (
              <Badge variant="secondary" className="gap-1">
                Advertiser: {advertiserFilter.length} selected
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => onAdvertiserFilterChange([])}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
