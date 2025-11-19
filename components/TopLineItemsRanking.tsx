"use client"

import { useMemo, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, DollarSign, Award, Medal, Trophy, Star, FileDown } from "lucide-react"
import type { ProcessedLineItem } from "@/components/ReportTable"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface TopLineItemsRankingProps {
  data: ProcessedLineItem[]
  topCount?: number
  globalSearch?: string
  insertionOrderFilter?: string[]
}

interface RankedItem extends ProcessedLineItem {
  rank: number
  combinedScore?: number
}

export function TopLineItemsRanking({
  data,
  topCount = 10,
  globalSearch = "",
  insertionOrderFilter = [],
}: TopLineItemsRankingProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const pdfExportRef = useRef<HTMLDivElement>(null)

  // Global filter function - applies to all rankings
  const applyGlobalFilters = (items: RankedItem[]): RankedItem[] => {
    let filtered = [...items]

    // Filter by keyword search (contains)
    if (globalSearch.trim()) {
      const searchLower = globalSearch.toLowerCase()
      filtered = filtered.filter((item) => {
        // Search across multiple fields
        const searchableFields = [
          item.LINEITEMID,
          item["NXN Line Item Name"],
          item["Insertion Order ID"],
          item["Insertion Order Name"],
          item["Advertiser Name"],
          item["Package ID"],
          item["Package Name"],
        ]
        return searchableFields.some(
          (field) => field && String(field).toLowerCase().includes(searchLower)
        )
      })
    }

    // Filter by insertion order
    if (insertionOrderFilter.length > 0) {
      filtered = filtered.filter(
        (item) =>
          item["Insertion Order Name"] &&
          insertionOrderFilter.includes(item["Insertion Order Name"])
      )
    }

    return filtered
  }

  // Get ALL filtered results (without topCount limit) for PDF export
  const getAllFilteredResults = () => {
    // Rank by Revenue - ALL results
    const allByRevenue = [...data]
      .filter((item) => item["Total Transaction Amount"] > 0)
      .sort((a, b) => b["Total Transaction Amount"] - a["Total Transaction Amount"])
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }))
    const filteredByRevenue = applyGlobalFilters(allByRevenue)

    // Rank by ROAS - ALL results
    const allByROAS = [...data]
      .filter(
        (item) =>
          item["Influenced ROAS (Not Deduplicated)"] !== undefined &&
          item["Influenced ROAS (Not Deduplicated)"] !== null &&
          !isNaN(item["Influenced ROAS (Not Deduplicated)"]!) &&
          item["Influenced ROAS (Not Deduplicated)"]! > 0
      )
      .sort(
        (a, b) =>
          (b["Influenced ROAS (Not Deduplicated)"] || 0) -
          (a["Influenced ROAS (Not Deduplicated)"] || 0)
      )
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }))
    const filteredByROAS = applyGlobalFilters(allByROAS)

    // Combined ranking - ALL results
    const itemsWithBoth = data.filter(
      (item) =>
        item["Total Transaction Amount"] > 0 &&
        item["Influenced ROAS (Not Deduplicated)"] !== undefined &&
        item["Influenced ROAS (Not Deduplicated)"] !== null &&
        !isNaN(item["Influenced ROAS (Not Deduplicated)"]!) &&
        item["Influenced ROAS (Not Deduplicated)"]! > 0
    )

    let allByCombined: RankedItem[] = []
    if (itemsWithBoth.length > 0) {
      const revenues = itemsWithBoth.map((item) => item["Total Transaction Amount"])
      const roasValues = itemsWithBoth.map(
        (item) => item["Influenced ROAS (Not Deduplicated)"] || 0
      )
      const maxRevenue = Math.max(...revenues, 1)
      const maxROAS = Math.max(...roasValues, 1)
      const minRevenue = Math.min(...revenues)
      const minROAS = Math.min(...roasValues)
      const revenueRange = maxRevenue - minRevenue
      const roasRange = maxROAS - minROAS

      allByCombined = itemsWithBoth
        .map((item) => {
          const normalizedRevenue =
            revenueRange > 0
              ? (item["Total Transaction Amount"] - minRevenue) / revenueRange
              : 0.5
          const normalizedROAS =
            roasRange > 0
              ? ((item["Influenced ROAS (Not Deduplicated)"] || 0) - minROAS) / roasRange
              : 0.5
          const combinedScore = normalizedRevenue * 0.6 + normalizedROAS * 0.4
          return {
            ...item,
            combinedScore,
          }
        })
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .map((item, index) => ({
          ...item,
          rank: index + 1,
        }))
    }
    const filteredByCombined = applyGlobalFilters(allByCombined)

    return {
      rankedByRevenue: filteredByRevenue,
      rankedByROAS: filteredByROAS,
      rankedByCombined: filteredByCombined,
    }
  }

  // Helper function to render a single section for PDF (2-column layout, more readable)
  const renderSectionForPDF = (items: RankedItem[], title: string, icon: string, description: string, showROAS: boolean = false, showCombined: boolean = false) => {
    return `
      <div style="width: 100%; max-width: 1200px; font-size: 18px; padding: 30px; font-family: Arial, sans-serif;">
        <div class="pb-4 mb-6 border-b" style="border-bottom: 3px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
          <h3 class="text-2xl font-bold flex items-center gap-3" style="font-size: 32px; margin-bottom: 10px; font-weight: 700; color: #111827;">
            <span style="font-size: 32px;">${icon}</span>
            <span>${title}</span>
          </h3>
          <p class="text-base text-gray-500 mt-2" style="font-size: 20px; color: #6b7280; margin-top: 8px;">${description}</p>
          <p style="font-size: 18px; color: #9ca3af; margin-top: 8px;">Total Items: ${items.length}</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          ${items.map((item) => `
            <div class="border-2 rounded-xl bg-white" style="padding: 20px; border-width: 2px; border-color: #d1d5db; border-radius: 12px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 4px;">
                  <div class="rounded-full border-2 flex items-center justify-center font-bold bg-yellow-100 text-yellow-800 border-yellow-300" style="width: 50px; height: 50px; font-size: 22px; flex-shrink: 0; border-radius: 50%; border-width: 2px; display: flex; align-items: center; justify-content: center;">
                    ${item.rank <= 3 ? (item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉') : item.rank}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div class="font-semibold" style="font-size: 20px; font-weight: 700; margin-bottom: 6px; word-break: break-word; color: #111827;">${item.LINEITEMID}</div>
                    <p class="text-gray-600" style="font-size: 16px; color: #4b5563; margin-bottom: 6px; word-break: break-word; line-height: 1.5;">${item["NXN Line Item Name"] || "No name available"}</p>
                    ${item["Insertion Order Name"] ? `<p class="text-gray-500" style="font-size: 15px; color: #6b7280; word-break: break-word; margin-top: 4px;">IO: ${item["Insertion Order Name"]}</p>` : ''}
                  </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="font-medium text-gray-500" style="font-size: 17px; color: #6b7280; font-weight: 600;">Revenue</span>
                    <span class="font-bold text-green-600" style="font-size: 19px; color: #16a34a; font-weight: 700;">$${item["Total Transaction Amount"].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  ${showROAS ? `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span class="font-medium text-gray-500" style="font-size: 17px; color: #6b7280; font-weight: 600;">ROAS</span>
                      <span class="font-bold text-blue-600" style="font-size: 19px; color: #2563eb; font-weight: 700;">${item["Influenced ROAS (Not Deduplicated)"]?.toFixed(2) || "N/A"}</span>
                    </div>
                  ` : ''}
                  ${showCombined && item.combinedScore !== undefined ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid #e5e7eb; margin-top: 4px;">
                      <span class="font-medium text-gray-500" style="font-size: 17px; color: #6b7280; font-weight: 600;">Combined Score</span>
                      <span class="font-semibold text-purple-600" style="font-size: 18px; color: #9333ea; font-weight: 700;">${(item.combinedScore * 100).toFixed(1)}%</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  // Helper function to add a section to PDF (all items on one page)
  const addSectionToPDF = async (pdf: jsPDF, items: RankedItem[], title: string, icon: string, description: string, showROAS: boolean = false, showCombined: boolean = false) => {
    const tempContainer = document.createElement("div")
    tempContainer.style.position = "absolute"
    tempContainer.style.left = "-9999px"
    tempContainer.style.top = "0"
    tempContainer.style.width = "1200px"
    tempContainer.className = "bg-white"
    tempContainer.style.fontSize = "18px"
    tempContainer.style.backgroundColor = "#ffffff"
    tempContainer.innerHTML = renderSectionForPDF(items, title, icon, description, showROAS, showCombined)
    document.body.appendChild(tempContainer)

    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 400))

    // Capture the section with higher scale for better quality
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 1200,
      width: 1200,
    })

    // Clean up
    document.body.removeChild(tempContainer)

    const imgData = canvas.toDataURL("image/png")
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min((pdfWidth - 30) / imgWidth, (pdfHeight - 20) / imgHeight)
    const imgScaledWidth = imgWidth * ratio
    const imgScaledHeight = imgHeight * ratio

    // Add new page for this section
    pdf.addPage()

    // Add image starting near top
    const startY = 10
    pdf.addImage(imgData, "PNG", (pdfWidth - imgScaledWidth) / 2, startY, imgScaledWidth, imgScaledHeight)

    // If content is too tall, add continuation pages
    let heightLeft = imgScaledHeight
    let position = startY

    while (heightLeft >= pdfHeight - startY - 5) {
      position = heightLeft - pdfHeight + startY + 5
      pdf.addPage()
      pdf.addImage(imgData, "PNG", (pdfWidth - imgScaledWidth) / 2, -position, imgScaledWidth, imgHeight * ratio)
      heightLeft -= pdfHeight - startY - 5
    }
  }

  // PDF Export function - exports ALL filtered results, one section per page
  const exportToPDF = async () => {
    try {
      // Get all filtered results
      const allResults = getAllFilteredResults()

      // Initialize PDF
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()

      // Add cover page with title and summary
      pdf.setFontSize(24)
      pdf.text("Top Performing Line Items", pdfWidth / 2, 50, { align: "center" })

      pdf.setFontSize(16)
      pdf.text(
        `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        pdfWidth / 2,
        70,
        { align: "center" }
      )

      pdf.setFontSize(14)
      pdf.text(
        `Total Items: Revenue (${allResults.rankedByRevenue.length}), ROAS (${allResults.rankedByROAS.length}), Combined (${allResults.rankedByCombined.length})`,
        pdfWidth / 2,
        85,
        { align: "center" }
      )

      // Add each section on its own page(s)
      if (allResults.rankedByRevenue.length > 0) {
        await addSectionToPDF(
          pdf,
          allResults.rankedByRevenue,
          "Top by Revenue",
          "💰",
          "Ranked by total transaction amount",
          false,
          false
        )
      }

      if (allResults.rankedByROAS.length > 0) {
        await addSectionToPDF(
          pdf,
          allResults.rankedByROAS,
          "Top by ROAS",
          "📈",
          "Ranked by Influenced ROAS",
          true,
          false
        )
      }

      if (allResults.rankedByCombined.length > 0) {
        await addSectionToPDF(
          pdf,
          allResults.rankedByCombined,
          "Top Combined",
          "🏆",
          "Revenue (60%) + ROAS (40%) score",
          true,
          true
        )
      }

      pdf.save(`top-performing-line-items-${new Date().toISOString().split("T")[0]}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    }
  }

  // Rank by Revenue
  const rankedByRevenue = useMemo(() => {
    const ranked = [...data]
      .filter((item) => item["Total Transaction Amount"] > 0)
      .sort((a, b) => b["Total Transaction Amount"] - a["Total Transaction Amount"])
      .slice(0, topCount * 2) // Get more items to account for filtering
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }))

    return applyGlobalFilters(ranked).slice(0, topCount)
  }, [data, topCount, globalSearch, insertionOrderFilter])

  // Rank by ROAS
  const rankedByROAS = useMemo(() => {
    const ranked = [...data]
      .filter(
        (item) =>
          item["Influenced ROAS (Not Deduplicated)"] !== undefined &&
          item["Influenced ROAS (Not Deduplicated)"] !== null &&
          !isNaN(item["Influenced ROAS (Not Deduplicated)"]!) &&
          item["Influenced ROAS (Not Deduplicated)"]! > 0
      )
      .sort(
        (a, b) =>
          (b["Influenced ROAS (Not Deduplicated)"] || 0) -
          (a["Influenced ROAS (Not Deduplicated)"] || 0)
      )
      .slice(0, topCount * 2) // Get more items to account for filtering
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }))

    return applyGlobalFilters(ranked).slice(0, topCount)
  }, [data, topCount, globalSearch, insertionOrderFilter])

  // Combined ranking by Revenue AND ROAS
  const rankedByCombined = useMemo(() => {
    // Filter items that have both revenue and ROAS
    const itemsWithBoth = data.filter(
      (item) =>
        item["Total Transaction Amount"] > 0 &&
        item["Influenced ROAS (Not Deduplicated)"] !== undefined &&
        item["Influenced ROAS (Not Deduplicated)"] !== null &&
        !isNaN(item["Influenced ROAS (Not Deduplicated)"]!) &&
        item["Influenced ROAS (Not Deduplicated)"]! > 0
    )

    if (itemsWithBoth.length === 0) return []

    // Normalize revenue and ROAS to 0-1 scale, then combine
    const revenues = itemsWithBoth.map((item) => item["Total Transaction Amount"])
    const roasValues = itemsWithBoth.map(
      (item) => item["Influenced ROAS (Not Deduplicated)"] || 0
    )

    const maxRevenue = Math.max(...revenues, 1) // Avoid division by zero
    const maxROAS = Math.max(...roasValues, 1) // Avoid division by zero
    const minRevenue = Math.min(...revenues)
    const minROAS = Math.min(...roasValues)

    // Use min-max normalization for better distribution
    const revenueRange = maxRevenue - minRevenue
    const roasRange = maxROAS - minROAS

    const ranked = itemsWithBoth
      .map((item) => {
        // Normalize both metrics to 0-1 scale using min-max normalization
        const normalizedRevenue =
          revenueRange > 0
            ? (item["Total Transaction Amount"] - minRevenue) / revenueRange
            : 0.5 // If all values are the same, give equal weight
        const normalizedROAS =
          roasRange > 0
            ? ((item["Influenced ROAS (Not Deduplicated)"] || 0) - minROAS) / roasRange
            : 0.5

        // Combined score: 60% revenue weight, 40% ROAS weight
        // This ensures high revenue items rank well, but high ROAS items also get recognition
        const combinedScore = normalizedRevenue * 0.6 + normalizedROAS * 0.4

        return {
          ...item,
          combinedScore,
        }
      })
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, topCount * 2) // Get more items to account for filtering
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }))

    return applyGlobalFilters(ranked).slice(0, topCount)
  }, [data, topCount, globalSearch, insertionOrderFilter])

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatROAS = (value?: number) => {
    if (value === undefined || value === null || isNaN(value)) return "N/A"
    return value.toFixed(2)
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />
    if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />
    return <Star className="h-3 w-3 text-muted-foreground" />
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-800 border-yellow-300"
    if (rank === 2) return "bg-gray-100 text-gray-800 border-gray-300"
    if (rank === 3) return "bg-amber-100 text-amber-800 border-amber-300"
    return "bg-muted text-muted-foreground"
  }

  const RankCard = ({
    item,
    showROAS = false,
    showCombined = false,
  }: {
    item: RankedItem
    showROAS?: boolean
    showCombined?: boolean
  }) => {
    const maxRevenue = Math.max(...rankedByRevenue.map((i) => i["Total Transaction Amount"]))
    const maxROAS = Math.max(
      ...rankedByROAS.map((i) => i["Influenced ROAS (Not Deduplicated)"] || 0)
    )
    const revenuePercentage = maxRevenue > 0 ? (item["Total Transaction Amount"] / maxRevenue) * 100 : 0
    const roasPercentage = showROAS && maxROAS > 0
      ? ((item["Influenced ROAS (Not Deduplicated)"] || 0) / maxROAS) * 100
      : 0

    return (
      <div className="group relative p-4 border rounded-xl bg-gradient-to-br from-background to-muted/20 hover:shadow-md transition-all duration-200 hover:border-primary/50">
        <div className="flex items-start gap-3">
          {/* Rank Badge */}
          <div className="flex-shrink-0">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-bold text-sm ${getRankBadgeColor(
                item.rank
              )}`}
            >
              {item.rank <= 3 ? getRankIcon(item.rank) : item.rank}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {item.LINEITEMID}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {item["NXN Line Item Name"] || "No name available"}
                </p>
                {item["Insertion Order Name"] && (
                  <p className="text-xs text-muted-foreground/80 mb-1">
                    IO: {item["Insertion Order Name"]}
                  </p>
                )}
              </div>
            </div>

            {/* Revenue Bar */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Revenue</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(item["Total Transaction Amount"])}
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* ROAS Bar */}
              {showROAS && item["Influenced ROAS (Not Deduplicated)"] && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">ROAS</span>
                    <span className="text-sm font-bold text-blue-600">
                      {formatROAS(item["Influenced ROAS (Not Deduplicated)"])}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(roasPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Combined Score */}
              {showCombined && item.combinedScore !== undefined && (
                <div className="pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Combined Score</span>
                    <span className="text-xs font-semibold text-purple-600">
                      {(item.combinedScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Ranking Cards */}
      <div ref={contentRef} className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Top by Revenue */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <span>Top by Revenue</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Ranked by total transaction amount
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {rankedByRevenue.length > 0 ? (
                rankedByRevenue.map((item) => <RankCard key={item.LINEITEMID} item={item} />)
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {globalSearch || insertionOrderFilter.length > 0
                      ? "No matching items found"
                      : "No data available"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top by ROAS */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <span>Top by ROAS</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Ranked by Influenced ROAS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {rankedByROAS.length > 0 ? (
                rankedByROAS.map((item) => (
                  <RankCard key={item.LINEITEMID} item={item} showROAS={true} />
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {globalSearch || insertionOrderFilter.length > 0
                      ? "No matching items found"
                      : "No data available"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top by Combined Score */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-purple-100">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <span>Top Combined</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Revenue (60%) + ROAS (40%) score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {rankedByCombined.length > 0 ? (
                rankedByCombined.map((item) => (
                  <RankCard
                    key={item.LINEITEMID}
                    item={item}
                    showROAS={true}
                    showCombined={true}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    {globalSearch || insertionOrderFilter.length > 0
                      ? "No matching items found"
                      : "No data available"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button onClick={exportToPDF} variant="outline">
          <FileDown className="h-4 w-4 mr-2" />
          Export to PDF
        </Button>
      </div>
    </div>
  )
}
