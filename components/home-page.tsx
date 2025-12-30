"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  saveScrollPosition,
  restoreScrollPosition,
  saveViewMode,
  getViewMode,
  type ViewMode,
} from "@/lib/scroll-restoration"
import { StageDetailView } from "@/components/stage-detail-view"
import {
  DashboardHeader,
  FilterBar,
  UploadView,
  PortfolioDialog,
  MainContent,
} from "@/components/dashboard"
import type { Startup, PipelineStage, Founder } from "@/lib/types"
import type { FilterCondition, SavedFilter } from "@/lib/filter-store"
import { getSavedFilters, applyFilters } from "@/lib/filter-store"
import { getAllStartups } from "@/lib/startup-storage"
import { exportAndDownload } from "@/lib/csv-export"

interface InvestmentForm {
  investmentDate: string
  investmentAmount: string
  ownership: string
  valuation: string
  investmentType: string
  leadInvestor: boolean
  boardSeat: boolean
}

const DEFAULT_INVESTMENT_FORM: InvestmentForm = {
  investmentDate: new Date().toISOString().split("T")[0],
  investmentAmount: "",
  ownership: "",
  valuation: "",
  investmentType: "Seed",
  leadInvestor: false,
  boardSeat: false,
}

export default function HomePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize view mode from URL or sessionStorage
  const getInitialViewMode = (): ViewMode => {
    const urlView = searchParams.get("view") as ViewMode | null
    if (urlView && ["kanban", "table", "founders-kanban", "founders-table"].includes(urlView)) {
      return urlView
    }
    return getViewMode() || "kanban"
  }

  // Core state
  const [startups, setStartups] = useState<Startup[]>([])
  const [founders, setFounders] = useState<Founder[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode)
  const [showUpload, setShowUpload] = useState(false)
  const [viewingStage, setViewingStage] = useState<PipelineStage | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [foundersLoading, setFoundersLoading] = useState(false)

  // Filter state
  const [limit, setLimit] = useState<number>(50)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [stageFilter, setStageFilter] = useState<string>("")
  const [founderSearchQuery, setFounderSearchQuery] = useState("")
  const [showOnlyShortlisted, setShowOnlyShortlisted] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [activeFilterIds, setActiveFilterIds] = useState<string[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  // Shortlist loading state
  const [shortlistLoading, setShortlistLoading] = useState<Set<string>>(new Set())

  // Error states
  const [portfolioError, setPortfolioError] = useState<string | null>(null)

  // Request tracking to prevent race conditions
  const startupRequestId = useRef(0)

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<{
    current: number
    total: number
    status?: string
  } | null>(null)

  // Portfolio state
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false)
  const [portfolioStartup, setPortfolioStartup] = useState<Startup | null>(null)
  const [portfolioInvestmentIds, setPortfolioInvestmentIds] = useState<string[]>([])
  const [investmentForm, setInvestmentForm] = useState<InvestmentForm>(DEFAULT_INVESTMENT_FORM)
  const [isCreatingInvestment, setIsCreatingInvestment] = useState(false)

  // Load saved filters on mount
  useEffect(() => {
    setSavedFilters(getSavedFilters())
  }, [])

  // Sync view mode to URL and sessionStorage
  useEffect(() => {
    const currentView = searchParams.get("view")
    if (currentView !== viewMode) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("view", viewMode)
      // Use replace to avoid polluting browser history
      router.replace(`?${params.toString()}`, { scroll: false })
    }
    saveViewMode(viewMode)
  }, [viewMode, searchParams, router])

  // Restore scroll position on mount (after data loads)
  useEffect(() => {
    if (!isLoading && startups.length > 0) {
      const timer = setTimeout(() => {
        restoreScrollPosition("dashboard")
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isLoading, startups.length])

  // Load portfolio investment IDs on mount
  useEffect(() => {
    async function loadPortfolioIds() {
      try {
        setPortfolioError(null)
        const response = await fetch("/api/portfolio")
        if (response.ok) {
          const data = await response.json()
          const investments = data.investments || []
          setPortfolioInvestmentIds(investments.map((inv: { startupId: string }) => inv.startupId))
        } else {
          setPortfolioError("Failed to load portfolio data")
        }
      } catch (error) {
        console.error("[Portfolio] Error loading portfolio IDs:", error)
        setPortfolioError("Failed to load portfolio data")
      }
    }
    loadPortfolioIds()
  }, [])

  // Fetch founders
  const fetchFounders = useCallback(async (search?: string) => {
    setFoundersLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("limit", "100")

      const response = await fetch(`/api/founders?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setFounders(data.founders || [])
      }
    } catch (error) {
      console.error("[Founders] Error loading founders:", error)
    } finally {
      setFoundersLoading(false)
    }
  }, [])

  // Load founders when switching to founders view
  useEffect(() => {
    if (viewMode === "founders-kanban" || viewMode === "founders-table") {
      fetchFounders(founderSearchQuery)
    }
  }, [viewMode, founderSearchQuery, fetchFounders])

  // Load startups with race condition prevention
  useEffect(() => {
    const currentRequestId = ++startupRequestId.current

    async function loadStartups() {
      setIsLoading(true)
      try {
        const { startups, pagination } = await getAllStartups({
          limit,
          search: searchQuery || undefined,
          pipelineStage: stageFilter || undefined,
        })
        // Only update state if this is still the latest request
        if (currentRequestId === startupRequestId.current) {
          setStartups(startups)
          setTotalCount(pagination?.total || 0)
        }
      } finally {
        // Only clear loading if this is still the latest request
        if (currentRequestId === startupRequestId.current) {
          setIsLoading(false)
        }
      }
    }
    loadStartups()
  }, [limit, searchQuery, stageFilter])

  // Filter startups
  const filteredStartups = useMemo(() => {
    let filtered = startups

    if (showOnlyShortlisted) {
      filtered = filtered.filter((s) => s.shortlisted)
    }

    if (activeFilterIds.length > 0) {
      const currentFilters = getSavedFilters()
      filtered = applyFilters(filtered, activeFilterIds, currentFilters)
    }

    return filtered
  }, [startups, showOnlyShortlisted, activeFilterIds])

  // Event handlers
  const handleSelectStartup = (startup: Startup) => {
    saveScrollPosition("dashboard")
    router.push(`/company/${startup.id}`)
  }

  const handleMoveStartup = async (startupId: string, newStage: PipelineStage) => {
    setStartups((prev) =>
      prev.map((startup) => (startup.id === startupId ? { ...startup, pipelineStage: newStage } : startup))
    )

    try {
      const response = await fetch(`/api/startups/${startupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      })

      if (!response.ok) throw new Error("Failed to update pipeline stage")
      console.log(`[Pipeline] Successfully moved startup ${startupId} to ${newStage}`)
    } catch (error) {
      console.error("[Pipeline] Error updating stage:", error)
      const { startups: refreshedStartups } = await getAllStartups({ limit })
      setStartups(refreshedStartups)
      alert("Failed to move company. Please try again.")
    }
  }

  const handleToggleShortlist = async (startupId: string, shortlisted: boolean) => {
    if (shortlistLoading.has(startupId)) return

    const startup = startups.find((s) => s.id === startupId)
    if (!startup) return

    setShortlistLoading((prev) => new Set(prev).add(startupId))

    // Shortlisting doesn't change pipeline stage anymore
    const newStage: PipelineStage = startup.pipelineStage

    const originalShortlisted = startup.shortlisted
    const originalStage = startup.pipelineStage

    setStartups((prev) =>
      prev.map((s) => (s.id === startupId ? { ...s, shortlisted, pipelineStage: newStage } : s))
    )

    try {
      const response = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId, shortlisted }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          alert("Please log in to shortlist companies.")
        } else {
          throw new Error("Failed to update shortlist status")
        }
        setStartups((prev) =>
          prev.map((s) =>
            s.id === startupId ? { ...s, shortlisted: originalShortlisted, pipelineStage: originalStage } : s
          )
        )
        return
      }

      await fetch(`/api/startups/${startupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      })
    } catch (error) {
      console.error("[Shortlist] Error updating shortlist:", error)
      setStartups((prev) =>
        prev.map((s) =>
          s.id === startupId ? { ...s, shortlisted: originalShortlisted, pipelineStage: originalStage } : s
        )
      )
      alert("Failed to update shortlist. Please try again.")
    } finally {
      setShortlistLoading((prev) => {
        const next = new Set(prev)
        next.delete(startupId)
        return next
      })
    }
  }

  const handleUploadComplete = async (uploadedStartups: Startup[]) => {
    try {
      const startupsWithStage = uploadedStartups.map((s) => ({
        ...s,
        pipelineStage: "Screening" as PipelineStage,
      }))

      const BATCH_SIZE = 100
      const totalBatches = Math.ceil(startupsWithStage.length / BATCH_SIZE)
      let totalUploaded = 0

      for (let i = 0; i < startupsWithStage.length; i += BATCH_SIZE) {
        const batch = startupsWithStage.slice(i, i + BATCH_SIZE)
        setUploadProgress({ current: totalUploaded, total: startupsWithStage.length })

        const response = await fetch("/api/startups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        })

        if (!response.ok) throw new Error(`Batch failed: ${response.statusText}`)

        const result = await response.json()
        totalUploaded += result.count || batch.length
      }

      setUploadProgress({ current: totalUploaded, total: totalUploaded, status: "Recalculating ranks..." })
      await fetch("/api/startups/recalculate-ranks", { method: "POST" })

      const { startups: refreshedStartups } = await getAllStartups({ limit })
      setStartups(refreshedStartups)
      setUploadProgress(null)
      setShowUpload(false)
      alert(`Successfully uploaded ${totalUploaded} companies in ${totalBatches} batches!`)
    } catch (error) {
      console.error("[Upload] Error uploading startups:", error)
      setUploadProgress(null)
      alert(`Failed to upload companies: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleMoveToPortfolio = (startup: Startup) => {
    if (portfolioInvestmentIds.includes(startup.id)) {
      router.push(`/portfolio/${startup.id}`)
      return
    }

    setPortfolioStartup(startup)
    setInvestmentForm(DEFAULT_INVESTMENT_FORM)
    setShowPortfolioDialog(true)
  }

  const handleCreatePortfolioInvestment = async () => {
    if (!portfolioStartup) return

    setIsCreatingInvestment(true)
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startupId: portfolioStartup.id,
          investmentDate: new Date(investmentForm.investmentDate),
          investmentAmount: investmentForm.investmentAmount ? parseFloat(investmentForm.investmentAmount) : null,
          ownership: investmentForm.ownership ? parseFloat(investmentForm.ownership) : null,
          valuation: investmentForm.valuation ? parseFloat(investmentForm.valuation) : null,
          investmentType: investmentForm.investmentType,
          leadInvestor: investmentForm.leadInvestor,
          boardSeat: investmentForm.boardSeat,
          status: "Active",
        }),
      })

      if (!response.ok) throw new Error("Failed to create portfolio investment")

      setStartups((prev) =>
        prev.map((s) => (s.id === portfolioStartup.id ? { ...s, pipelineStage: "Closed" as PipelineStage } : s))
      )
      setPortfolioInvestmentIds((prev) => [...prev, portfolioStartup.id])
      setShowPortfolioDialog(false)
      setPortfolioStartup(null)
      router.push(`/portfolio/${portfolioStartup.id}`)
    } catch (error) {
      console.error("[Portfolio] Error creating investment:", error)
      alert("Failed to create portfolio investment. Please try again.")
    } finally {
      setIsCreatingInvestment(false)
    }
  }

  const handleMoveFounder = async (founderId: string, newStage: PipelineStage, isLegacy: boolean) => {
    setFounders((prev) =>
      prev.map((founder) => (founder.id === founderId ? { ...founder, pipelineStage: newStage } : founder))
    )

    try {
      if (isLegacy) {
        const founder = founders.find((f) => f.id === founderId)
        if (!founder) throw new Error("Founder not found")

        const response = await fetch("/api/founders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: founder.name,
            education: founder.education,
            experience: founder.priorExperience,
            linkedIn: founder.linkedIn,
            companyName: founder.companyName,
            role: founder.role || "Founder",
            pipelineStage: newStage,
          }),
        })

        if (!response.ok) throw new Error("Failed to migrate founder to database")
        await fetchFounders(founderSearchQuery)
      } else {
        const response = await fetch(`/api/founders/${founderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipelineStage: newStage }),
        })

        if (!response.ok) throw new Error("Failed to update founder pipeline stage")
      }
    } catch (error) {
      console.error("[Founder Pipeline] Error updating stage:", error)
      await fetchFounders(founderSearchQuery)
      alert("Failed to move founder. Please try again.")
    }
  }

  const handleSelectFounder = (founder: Founder) => {
    saveScrollPosition("dashboard")
    router.push(`/founder/${founder.id}`)
  }

  const handleFounderOutreach = (founder: Founder) => {
    router.push(`/company/${founder.companyId}?tab=outreach&founder=${encodeURIComponent(founder.name)}`)
  }

  const handleAskAI = async (query: string): Promise<FilterCondition[]> => {
    const response = await fetch("/api/filter-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) throw new Error("Failed to process AI query")
    const data = await response.json()
    return data.conditions
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setStageFilter("")
    setShowOnlyShortlisted(false)
    setActiveFilterIds([])
    setFounderSearchQuery("")
  }

  const handleExportCSV = () => {
    const filename = showOnlyShortlisted
      ? `shortlisted-companies-${new Date().toISOString().split("T")[0]}.csv`
      : `all-companies-${new Date().toISOString().split("T")[0]}.csv`
    exportAndDownload(filteredStartups, filename)
  }

  const handleSwitchToTableView = () => {
    setViewMode("table")
    // Keep current limit - don't auto-load massive datasets
    setStageFilter("")
    setShowFilterPanel(true)
  }

  const handleSwitchToKanbanView = () => {
    setViewMode("kanban")
    setShowFilterPanel(false)
  }

  const handleSwitchToFoundersView = () => {
    setViewMode("founders-kanban")
    setShowFilterPanel(false)
  }

  const hasActiveFilters =
    searchQuery || stageFilter || showOnlyShortlisted || activeFilterIds.length > 0 || founderSearchQuery

  // Render upload view
  if (showUpload) {
    return (
      <UploadView
        uploadProgress={uploadProgress}
        onUploadComplete={handleUploadComplete}
        onBack={() => setShowUpload(false)}
      />
    )
  }

  // Render stage detail view
  if (viewingStage) {
    return (
      <StageDetailView
        stage={viewingStage}
        startups={startups}
        onBack={() => setViewingStage(null)}
        onSelectStartup={handleSelectStartup}
        onMoveStartup={handleMoveStartup}
        onToggleShortlist={handleToggleShortlist}
        shortlistLoading={shortlistLoading}
      />
    )
  }

  // Main dashboard view
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <DashboardHeader
        viewMode={viewMode}
        filteredCount={filteredStartups.length}
        totalCount={totalCount}
        showOnlyShortlisted={showOnlyShortlisted}
        limit={limit}
        onLimitChange={setLimit}
        onSwitchToKanban={handleSwitchToKanbanView}
        onSwitchToTable={handleSwitchToTableView}
        onSwitchToFounders={handleSwitchToFoundersView}
        onSetViewMode={setViewMode}
        onShowUpload={() => setShowUpload(true)}
      />

      <FilterBar
        viewMode={viewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        founderSearchQuery={founderSearchQuery}
        onFounderSearchChange={setFounderSearchQuery}
        stageFilter={stageFilter}
        onStageFilterChange={setStageFilter}
        showOnlyShortlisted={showOnlyShortlisted}
        onToggleShortlist={() => setShowOnlyShortlisted(!showOnlyShortlisted)}
        showFilterPanel={showFilterPanel}
        onToggleFilterPanel={() => setShowFilterPanel(!showFilterPanel)}
        activeFilterCount={activeFilterIds.length}
        onExportCSV={handleExportCSV}
        onResetFilters={handleResetFilters}
        hasActiveFilters={!!hasActiveFilters}
      />

      <MainContent
        viewMode={viewMode}
        isLoading={isLoading}
        limit={limit}
        filteredStartups={filteredStartups}
        onSelectStartup={handleSelectStartup}
        onMoveStartup={handleMoveStartup}
        onViewStage={setViewingStage}
        onMoveToPortfolio={handleMoveToPortfolio}
        portfolioInvestmentIds={portfolioInvestmentIds}
        onToggleShortlist={handleToggleShortlist}
        shortlistLoading={shortlistLoading}
        founders={founders}
        foundersLoading={foundersLoading}
        onSelectFounder={handleSelectFounder}
        onMoveFounder={handleMoveFounder}
        onFounderViewStage={(stage) => console.log(`[Founder Pipeline] View stage: ${stage}`)}
        onSelectCompanyFromFounders={(companyId) => router.push(`/company/${companyId}`)}
        onFounderOutreach={handleFounderOutreach}
        showFilterPanel={showFilterPanel}
        activeFilterIds={activeFilterIds}
        onActiveFiltersChange={setActiveFilterIds}
        onAskAI={handleAskAI}
      />

      <PortfolioDialog
        open={showPortfolioDialog}
        onOpenChange={setShowPortfolioDialog}
        startup={portfolioStartup}
        investmentForm={investmentForm}
        onFormChange={setInvestmentForm}
        onSubmit={handleCreatePortfolioInvestment}
        onCancel={() => {
          setShowPortfolioDialog(false)
          setPortfolioStartup(null)
        }}
        isSubmitting={isCreatingInvestment}
      />
    </div>
  )
}
