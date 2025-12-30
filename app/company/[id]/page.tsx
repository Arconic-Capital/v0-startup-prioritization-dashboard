"use client"

import type React from "react"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, ExternalLink, Trash2, Pencil, Loader2, Copy, Check, Mail, MessageSquare, Calendar } from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { BackButton } from "@/components/back-button"
import type { OutreachMessages, OutreachTone } from "@/lib/outreach-generator"
import { getStartupById } from "@/lib/startup-storage"
import { InvestmentMemoDialog } from "@/components/investment-memo-dialog"
import type { PipelineStage, ThresholdIssue } from "@/lib/types"
import { STAGE_TABS, PIPELINE_STAGES } from "@/lib/types"
import type { InvestmentDecision, ValuationData, LegalDiligenceData } from "@/lib/types"
import { StageNavigation } from "@/components/stage-navigation"
import { InvestmentDecisionComponent } from "@/components/investment-decision"
import { ValuationTermsComponent } from "@/components/valuation-terms"
import { LegalDiligenceComponent } from "@/components/legal-diligence"
import { RejectionEmailsComponent } from "@/components/rejection-emails"
import { SCORECARD_TEMPLATE } from "@/lib/scorecard-template"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DynamicDataSection } from "@/components/dynamic-data-section"
import type { CustomData, CustomSchema } from "@/lib/types"

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [memoDialogOpen, setMemoDialogOpen] = useState(false)
  const [currentMemo, setCurrentMemo] = useState<string>("")
  const [memoCompanyName, setMemoCompanyName] = useState<string>("")

  const [scorecardScores, setScorecardScores] = useState<Record<string, number>>({})
  const [scorecardComments, setScorecardComments] = useState<Record<string, string>>({})
  const [reviewerName, setReviewerName] = useState("")
  const [isSavingScorecard, setIsSavingScorecard] = useState(false)
  const [scorecardLastSaved, setScorecardLastSaved] = useState<string | null>(null)
  const [editingScorecardIndex, setEditingScorecardIndex] = useState<number | null>(null)
  const [savedScorecards, setSavedScorecards] = useState<Array<{
    reviewerName: string
    scores: Record<string, number>
    comments?: Record<string, string>
    totalScore: number
    lastUpdated: string
  }>>([])

  const [startup, setStartup] = useState<ReturnType<typeof getStartupById>>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [shortlistedBy, setShortlistedBy] = useState<Array<{
    userName: string
    email: string
    shortlistedAt: string
  }>>([])

  useEffect(() => {
    // Load startup data on client side to avoid hydration mismatch
    async function loadStartup() {
      const data = await getStartupById(id)
      setStartup(data)
      setIsLoading(false)
    }
    loadStartup()
  }, [id])

  // Load who shortlisted this company
  useEffect(() => {
    async function loadShortlist() {
      try {
        const response = await fetch(`/api/shortlist?startupId=${id}`)
        if (response.ok) {
          const data = await response.json()
          setShortlistedBy(data.shortlistedBy || [])
        }
      } catch (error) {
        console.error("[Shortlist] Error loading shortlist:", error)
      }
    }
    if (id) {
      loadShortlist()
    }
  }, [id])

  const [currentStage, setCurrentStage] = useState<PipelineStage>(startup?.pipelineStage || "Screening")

  // State for initial assessment
  const [assessment, setAssessment] = useState({
    marketOpportunity: startup?.initialAssessment?.marketOpportunity || 0,
    teamQuality: startup?.initialAssessment?.teamQuality || 0,
    productInnovation: startup?.initialAssessment?.productInnovation || 0,
    businessModel: startup?.initialAssessment?.businessModel || 0,
    competitivePosition: startup?.initialAssessment?.competitivePosition || 0,
    commentary: startup?.initialAssessment?.commentary || "",
  })

  // State for threshold issues
  const [thresholdIssues, setThresholdIssues] = useState<ThresholdIssue[]>(startup?.thresholdIssues || [])
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [isGeneratingIssues, setIsGeneratingIssues] = useState(false)
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null)
  const [isSavingIssue, setIsSavingIssue] = useState(false)
  const [newIssue, setNewIssue] = useState({
    category: "" as ThresholdIssue["category"],
    issue: "",
    riskRating: "" as ThresholdIssue["riskRating"],
    mitigation: "",
    status: "Open" as ThresholdIssue["status"],
  })

  const [showTranscriptInput, setShowTranscriptInput] = useState(false)
  const [transcriptText, setTranscriptText] = useState("")
  const [showPitchDeckInput, setShowPitchDeckInput] = useState(false)
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null)

  // State for outreach messages
  const [outreachTone, setOutreachTone] = useState<OutreachTone>("friendly")
  const [outreachMessages, setOutreachMessages] = useState<OutreachMessages | null>(null)
  const [isGeneratingOutreach, setIsGeneratingOutreach] = useState(false)
  const [copiedMessageType, setCopiedMessageType] = useState<string | null>(null)

  const [assessmentScores, setAssessmentScores] = useState({
    marketOpportunity: 0,
    teamQuality: 0,
    productInnovation: 0,
    businessModel: 0,
    competitivePosition: 0,
  })
  const [assessmentCommentary, setAssessmentCommentary] = useState("")

  // State for editing overview
  const [isEditingOverview, setIsEditingOverview] = useState(false)
  const [isSavingOverview, setIsSavingOverview] = useState(false)
  const [editableData, setEditableData] = useState({
    // Basic info
    name: "",
    description: "",
    country: "",
    // Company info
    companyInfo: {
      website: "",
      linkedin: "",
      location: "",
      employeeCount: "",
      area: "",
      ventureCapitalFirm: "",
      founded: "",
      founders: "",
    },
    // Rationale
    rationale: {
      keyStrengths: "",
      areasOfConcern: "",
    },
    // Market info
    marketInfo: {
      b2bOrB2c: "",
      subIndustry: "",
      marketSize: "",
      aiDisruptionPropensity: "",
      industry: "",
      targetPersona: "",
      marketCompetitionAnalysis: "",
    },
    // Team info
    teamInfo: {
      foundersEducation: "",
      foundersPriorExperience: "",
      keyTeamMembers: "",
      teamDepth: "",
      teamExecutionAssessment: "",
    },
    // Sales info
    salesInfo: {
      salesMotion: "",
      salesCycleLength: "",
      salesComplexity: "",
      gtmStrategy: "",
      channels: "",
    },
    // Product info
    productInfo: {
      productName: "",
      horizontalOrVertical: "",
      problemSolved: "",
      moat: "",
    },
    // Business model info
    businessModelInfo: {
      revenueModel: "",
      pricingStrategy: "",
      unitEconomics: "",
    },
    // Competitive info
    competitiveInfo: {
      competitors: "",
      industryMultiples: "",
    },
    // Risk info
    riskInfo: {
      regulatoryRisk: "",
    },
    // Opportunity info
    opportunityInfo: {
      exitPotential: "",
    },
  })

  useEffect(() => {
    if (startup?.thresholdIssues) {
      setThresholdIssues(startup.thresholdIssues)
    }
    // Load existing scorecard data
    if (startup?.investmentScorecard) {
      const scorecardData = startup.investmentScorecard as any

      // Handle both old format (single object) and new format (array)
      if (Array.isArray(scorecardData)) {
        // New format: array of scorecards
        setSavedScorecards(scorecardData)
      } else if (scorecardData.scores) {
        // Old format: single scorecard object - migrate to array format
        setSavedScorecards([scorecardData])
      }
    }

    // Load startup data into editable state
    if (startup) {
      setEditableData({
        name: startup.name || "",
        description: startup.description || "",
        country: startup.country || "",
        companyInfo: {
          website: startup.companyInfo?.website || "",
          linkedin: startup.companyInfo?.linkedin || "",
          location: startup.companyInfo?.location || "",
          employeeCount: startup.companyInfo?.employeeCount || "",
          area: startup.companyInfo?.area || "",
          ventureCapitalFirm: startup.companyInfo?.ventureCapitalFirm || "",
          founded: startup.companyInfo?.founded || "",
          founders: startup.companyInfo?.founders || "",
        },
        rationale: {
          keyStrengths: startup.rationale?.keyStrengths || "",
          areasOfConcern: startup.rationale?.areasOfConcern || "",
        },
        marketInfo: {
          b2bOrB2c: startup.marketInfo?.b2bOrB2c || "",
          subIndustry: startup.marketInfo?.subIndustry || "",
          marketSize: startup.marketInfo?.marketSize || "",
          aiDisruptionPropensity: startup.marketInfo?.aiDisruptionPropensity || "",
          industry: startup.marketInfo?.industry || "",
          targetPersona: startup.marketInfo?.targetPersona || "",
          marketCompetitionAnalysis: startup.marketInfo?.marketCompetitionAnalysis || "",
        },
        teamInfo: {
          foundersEducation: startup.teamInfo?.foundersEducation || "",
          foundersPriorExperience: startup.teamInfo?.foundersPriorExperience || "",
          keyTeamMembers: startup.teamInfo?.keyTeamMembers || "",
          teamDepth: startup.teamInfo?.teamDepth || "",
          teamExecutionAssessment: startup.teamInfo?.teamExecutionAssessment || "",
        },
        salesInfo: {
          salesMotion: startup.salesInfo?.salesMotion || "",
          salesCycleLength: startup.salesInfo?.salesCycleLength || "",
          salesComplexity: startup.salesInfo?.salesComplexity || "",
          gtmStrategy: startup.salesInfo?.gtmStrategy || "",
          channels: startup.salesInfo?.channels || "",
        },
        productInfo: {
          productName: startup.productInfo?.productName || "",
          horizontalOrVertical: startup.productInfo?.horizontalOrVertical || "",
          problemSolved: startup.productInfo?.problemSolved || "",
          moat: startup.productInfo?.moat || "",
        },
        businessModelInfo: {
          revenueModel: startup.businessModelInfo?.revenueModel || "",
          pricingStrategy: startup.businessModelInfo?.pricingStrategy || "",
          unitEconomics: startup.businessModelInfo?.unitEconomics || "",
        },
        competitiveInfo: {
          competitors: startup.competitiveInfo?.competitors || "",
          industryMultiples: startup.competitiveInfo?.industryMultiples || "",
        },
        riskInfo: {
          regulatoryRisk: startup.riskInfo?.regulatoryRisk || "",
        },
        opportunityInfo: {
          exitPotential: startup.opportunityInfo?.exitPotential || "",
        },
      })
    }
  }, [startup]) // Re-run effect if startup changes

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  if (!startup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Company not found</h1>
          <Button onClick={() => router.push("/")}>Back to Pipeline</Button>
        </div>
      </div>
    )
  }

  const handleGenerateMemo = () => {
    router.push(`/company/${id}/memo`)
  }

  const handleRegenerateScores = () => {
    console.log("[v0] Regenerating AI scores for startup:", startup.id)
    alert(
      "AI Score Regeneration\n\nThis feature will analyze all available data (transcripts, pitch decks, scorecards, etc.) to update the AI-generated scores.\n\nIn production, this would trigger an LLM analysis pipeline.",
    )
  }

  const handleScoreChange = (section: string, criterion: string, score: number) => {
    const key = `${section}-${criterion}`
    setScorecardScores((prev) => ({ ...prev, [key]: Math.max(0, Math.min(10, score)) }))
  }

  const calculateTotalScore = () => {
    let total = 0
    SCORECARD_TEMPLATE.forEach((criterion) => {
      const key = `${criterion.section}-${criterion.criterion}`
      const score = scorecardScores[key] || 0
      total += (score / 10) * criterion.weight
    })
    return total.toFixed(1)
  }

  const getScoreDescription = (score: number, criterion: (typeof SCORECARD_TEMPLATE)[number]) => {
    if (score >= 1 && score <= 3) return criterion.low
    if (score >= 4 && score <= 6) return criterion.medium
    if (score >= 7 && score <= 10) return criterion.high
    return ""
  }

  const handleSaveIssue = async () => {
    if (!newIssue.issue.trim() || !newIssue.mitigation.trim()) {
      alert("Please fill in all fields")
      return
    }

    setIsSavingIssue(true)
    try {
      if (editingIssueId) {
        // Update existing issue
        const response = await fetch(`/api/threshold-issues/${editingIssueId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: newIssue.category || "Other",
            issue: newIssue.issue,
            riskRating: newIssue.riskRating || "Medium",
            mitigation: newIssue.mitigation,
            status: newIssue.status,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to update threshold issue")
        }

        const updatedIssue = await response.json()

        // Update local state
        setThresholdIssues((prev) => prev.map((issue) => (issue.id === editingIssueId ? updatedIssue : issue)))

        alert("Threshold issue updated successfully!")
      } else {
        // Create new issue
        const response = await fetch("/api/threshold-issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startupId: id,
            category: newIssue.category || "Other",
            issue: newIssue.issue,
            riskRating: newIssue.riskRating || "Medium",
            mitigation: newIssue.mitigation,
            status: newIssue.status,
            source: "Manual",
            identifiedDate: new Date().toISOString().split("T")[0],
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to create threshold issue")
        }

        const createdIssue = await response.json()

        // Add to local state
        setThresholdIssues((prev) => [...prev, createdIssue])

        alert("Threshold issue saved successfully!")
      }

      // Reset form
      setNewIssue({
        category: "Other",
        issue: "",
        riskRating: "Medium",
        mitigation: "",
        status: "Open",
      })
      setEditingIssueId(null)
      setShowIssueForm(false)
    } catch (error) {
      console.error("[Threshold Issues] Error saving issue:", error)
      alert(`Failed to save threshold issue: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSavingIssue(false)
    }
  }

  const handleEditIssue = (issue: ThresholdIssue) => {
    setNewIssue({
      category: issue.category,
      issue: issue.issue,
      riskRating: issue.riskRating,
      mitigation: issue.mitigation,
      status: issue.status,
    })
    setEditingIssueId(issue.id)
    setShowIssueForm(true)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCancelEditIssue = () => {
    setNewIssue({
      category: "Other",
      issue: "",
      riskRating: "Medium",
      mitigation: "",
      status: "Open",
    })
    setEditingIssueId(null)
    setShowIssueForm(false)
  }

  const handleDeleteIssue = async (issueId: string) => {
    if (!confirm("Are you sure you want to delete this threshold issue? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/threshold-issues/${issueId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete threshold issue")
      }

      // Remove from local state
      setThresholdIssues((prev) => prev.filter((issue) => issue.id !== issueId))

      alert("Threshold issue deleted successfully!")
    } catch (error) {
      console.error("[Threshold Issues] Error deleting issue:", error)
      alert(`Failed to delete threshold issue: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleGenerateIssues = async () => {
    setIsGeneratingIssues(true)
    try {
      const response = await fetch(`/api/startups/${id}/generate-issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()

      if (!response.ok) {
        alert(`Failed to generate issues: ${result.error || result.details || "Unknown error"}`)
        return
      }

      // Refresh startup data to get updated threshold issues
      const updatedStartup = await getStartupById(id)
      if (updatedStartup?.thresholdIssues) {
        setThresholdIssues(updatedStartup.thresholdIssues)
      }

      // Show success message
      if (result.count === 0) {
        alert(result.message || "No new threshold issues identified from scorecard commentary")
      } else {
        const message =
          result.skipped > 0
            ? `Generated ${result.count} new threshold issue${result.count > 1 ? "s" : ""} (skipped ${result.skipped} duplicate${result.skipped > 1 ? "s" : ""})`
            : `Generated ${result.count} new threshold issue${result.count > 1 ? "s" : ""}`
        alert(message)
      }
    } catch (error) {
      console.error("[Generate Issues] Error:", error)
      alert(`Failed to generate issues: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGeneratingIssues(false)
    }
  }

  // Overview editing handlers
  const handleStartEditOverview = () => {
    setIsEditingOverview(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCancelEditOverview = () => {
    // Reload original data
    if (startup) {
      setEditableData({
        name: startup.name || "",
        description: startup.description || "",
        country: startup.country || "",
        companyInfo: {
          website: startup.companyInfo?.website || "",
          linkedin: startup.companyInfo?.linkedin || "",
          location: startup.companyInfo?.location || "",
          employeeCount: startup.companyInfo?.employeeCount || "",
          area: startup.companyInfo?.area || "",
          ventureCapitalFirm: startup.companyInfo?.ventureCapitalFirm || "",
          founded: startup.companyInfo?.founded || "",
          founders: startup.companyInfo?.founders || "",
        },
        rationale: {
          keyStrengths: startup.rationale?.keyStrengths || "",
          areasOfConcern: startup.rationale?.areasOfConcern || "",
        },
        marketInfo: {
          b2bOrB2c: startup.marketInfo?.b2bOrB2c || "",
          subIndustry: startup.marketInfo?.subIndustry || "",
          marketSize: startup.marketInfo?.marketSize || "",
          aiDisruptionPropensity: startup.marketInfo?.aiDisruptionPropensity || "",
          industry: startup.marketInfo?.industry || "",
          targetPersona: startup.marketInfo?.targetPersona || "",
          marketCompetitionAnalysis: startup.marketInfo?.marketCompetitionAnalysis || "",
        },
        teamInfo: {
          foundersEducation: startup.teamInfo?.foundersEducation || "",
          foundersPriorExperience: startup.teamInfo?.foundersPriorExperience || "",
          keyTeamMembers: startup.teamInfo?.keyTeamMembers || "",
          teamDepth: startup.teamInfo?.teamDepth || "",
          teamExecutionAssessment: startup.teamInfo?.teamExecutionAssessment || "",
        },
        salesInfo: {
          salesMotion: startup.salesInfo?.salesMotion || "",
          salesCycleLength: startup.salesInfo?.salesCycleLength || "",
          salesComplexity: startup.salesInfo?.salesComplexity || "",
          gtmStrategy: startup.salesInfo?.gtmStrategy || "",
          channels: startup.salesInfo?.channels || "",
        },
        productInfo: {
          productName: startup.productInfo?.productName || "",
          horizontalOrVertical: startup.productInfo?.horizontalOrVertical || "",
          problemSolved: startup.productInfo?.problemSolved || "",
          moat: startup.productInfo?.moat || "",
        },
        businessModelInfo: {
          revenueModel: startup.businessModelInfo?.revenueModel || "",
          pricingStrategy: startup.businessModelInfo?.pricingStrategy || "",
          unitEconomics: startup.businessModelInfo?.unitEconomics || "",
        },
        competitiveInfo: {
          competitors: startup.competitiveInfo?.competitors || "",
          industryMultiples: startup.competitiveInfo?.industryMultiples || "",
        },
        riskInfo: {
          regulatoryRisk: startup.riskInfo?.regulatoryRisk || "",
        },
        opportunityInfo: {
          exitPotential: startup.opportunityInfo?.exitPotential || "",
        },
      })
    }
    setIsEditingOverview(false)
  }

  const handleSaveOverview = async () => {
    setIsSavingOverview(true)
    try {
      const response = await fetch(`/api/startups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editableData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save overview")
      }

      // Reload the startup data
      const updatedStartup = await getStartupById(id)
      setStartup(updatedStartup)

      setIsEditingOverview(false)
      alert("Overview updated successfully!")
    } catch (error) {
      console.error("[Overview] Error saving overview:", error)
      alert(`Failed to save overview: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSavingOverview(false)
    }
  }

  const getRiskColor = (rating: string) => {
    switch (rating) {
      case "High":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "Low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return ""
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "In Progress":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "Resolved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "Accepted Risk":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return ""
    }
  }

  const getScoreColor = (score: number) => {
    if (score === 0) return "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600"
    if (score <= 3) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
    if (score <= 6) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
    return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
  }

  const getScoreLabel = (score: number) => {
    if (score === 0) return "Not Rated"
    if (score <= 3) return "Weak"
    if (score <= 6) return "Moderate"
    return "Strong"
  }

  const getAssessmentCompletion = () => {
    const scores = Object.values(assessmentScores)
    const completed = scores.filter((s) => s > 0).length
    return Math.round((completed / scores.length) * 100)
  }

  const handleSaveAssessment = () => {
    console.log("[v0] Saving initial assessment:", assessmentScores, assessmentCommentary)
    alert("Initial assessment saved successfully!")
  }

  // Outreach message generation handlers
  const handleGenerateOutreach = async () => {
    if (!startup) return

    setIsGeneratingOutreach(true)
    setOutreachMessages(null)

    try {
      console.log("[Outreach] Generating messages for:", startup.name, "with tone:", outreachTone)

      const response = await fetch("/api/generate-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startup, tone: outreachTone }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate outreach messages")
      }

      const { messages } = await response.json()
      setOutreachMessages(messages)
      console.log("[Outreach] Messages generated successfully")
    } catch (error) {
      console.error("[Outreach] Error generating messages:", error)
      alert(`Failed to generate outreach messages: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGeneratingOutreach(false)
    }
  }

  const handleCopyMessage = async (messageType: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageType(messageType)
      setTimeout(() => setCopiedMessageType(null), 2000)
    } catch (error) {
      console.error("[Outreach] Failed to copy:", error)
    }
  }

  const handleUploadTranscript = async () => {
    if (!transcriptText.trim()) {
      alert("Please enter transcript text")
      return
    }

    try {
      console.log("[Upload] Uploading transcript text")

      const formData = new FormData()
      formData.append("startupId", id)
      formData.append("docType", "transcript")
      formData.append("textContent", transcriptText)

      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload transcript")
      }

      const result = await response.json()
      console.log("[Upload] Transcript uploaded successfully:", result)

      // Reset state and reload to show updated document
      setTranscriptText("")
      setShowTranscriptInput(false)
      window.location.reload()
    } catch (error) {
      console.error("[Upload] Error uploading transcript:", error)
      alert(`Failed to upload transcript: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handlePitchDeckFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const maxSize = 4 * 1024 * 1024 // 4 MB limit for Vercel
      const isProduction = window.location.hostname !== 'localhost'

      // Only enforce size limit on production (Vercel)
      if (isProduction && file.size > maxSize) {
        alert(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum file size is 4MB for pitch decks on Vercel. Please use localhost for larger files or compress the PDF.`)
        e.target.value = '' // Reset the file input
        return
      }

      setPitchDeckFile(file)
    }
  }

  const handleUploadPitchDeckFile = async () => {
    if (!pitchDeckFile) {
      alert("Please select a file")
      return
    }

    try {
      console.log("[Upload] Uploading PDF pitch deck:", pitchDeckFile.name)

      const formData = new FormData()
      formData.append("startupId", id)
      formData.append("docType", "pitchDeck")
      formData.append("file", pitchDeckFile)

      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        // Try to parse JSON error, but handle non-JSON responses (like HTML error pages)
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to upload pitch deck")
        } else {
          // Likely an HTML error page from Vercel (e.g., Request Entity Too Large)
          const text = await response.text()
          if (text.includes("Request Entity Too Large") || response.status === 413) {
            throw new Error("File is too large. Vercel has a 4MB limit for uploads. Please use a smaller file.")
          }
          throw new Error(`Upload failed with status ${response.status}`)
        }
      }

      const result = await response.json()
      console.log("[Upload] Pitch deck uploaded successfully:", result)

      // Reset state and reload to show updated document
      setPitchDeckFile(null)
      setShowPitchDeckInput(false)
      window.location.reload()
    } catch (error) {
      console.error("[Upload] Error uploading pitch deck:", error)
      alert(`Failed to upload pitch deck: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handleSaveScorecard = async () => {
    try {
      setIsSavingScorecard(true)

      // Build new scorecard entry
      const newScorecardEntry = {
        reviewerName: reviewerName.trim() || "Anonymous",
        scores: scorecardScores,
        comments: scorecardComments,
        totalScore: parseFloat(calculateTotalScore()),
        lastUpdated: new Date().toISOString(),
      }

      console.log("[Scorecard] Saving scorecard:", newScorecardEntry)

      // Update or append scorecard
      let updatedScorecards
      if (editingScorecardIndex !== null) {
        // Update existing scorecard
        updatedScorecards = [...savedScorecards]
        updatedScorecards[editingScorecardIndex] = newScorecardEntry
      } else {
        // Append new scorecard
        updatedScorecards = [...savedScorecards, newScorecardEntry]
      }

      // Update startup with scorecard array
      const response = await fetch(`/api/startups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investmentScorecard: updatedScorecards,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save scorecard")
      }

      const result = await response.json()
      console.log("[Scorecard] Scorecard saved successfully")

      // Update saved scorecards state
      setSavedScorecards(updatedScorecards)

      // Reset the form
      setScorecardScores({})
      setScorecardComments({})
      setReviewerName("")
      setEditingScorecardIndex(null)
      setScorecardLastSaved(null)

      alert(
        editingScorecardIndex !== null
          ? "Scorecard updated successfully!"
          : "Scorecard saved successfully!",
      )
    } catch (error) {
      console.error("[Scorecard] Error saving scorecard:", error)
      alert(`Failed to save scorecard: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSavingScorecard(false)
    }
  }

  const handleEditScorecard = (index: number) => {
    const scorecard = savedScorecards[index]
    setScorecardScores(scorecard.scores)
    setScorecardComments(scorecard.comments || {})
    setReviewerName(scorecard.reviewerName)
    setEditingScorecardIndex(index)
    // Scroll to top of scorecard form
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCancelEdit = () => {
    setScorecardScores({})
    setScorecardComments({})
    setReviewerName("")
    setEditingScorecardIndex(null)
  }

  const handleDeleteScorecard = async (indexToDelete: number) => {
    if (!confirm("Are you sure you want to delete this scorecard? This action cannot be undone.")) {
      return
    }

    try {
      // Remove the scorecard at the specified index
      const updatedScorecards = savedScorecards.filter((_, index) => index !== indexToDelete)

      // Update startup with new scorecards array
      const response = await fetch(`/api/startups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investmentScorecard: updatedScorecards,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete scorecard")
      }

      // Update local state
      setSavedScorecards(updatedScorecards)
      alert("Scorecard deleted successfully!")
    } catch (error) {
      console.error("[Scorecard] Error deleting scorecard:", error)
      alert(`Failed to delete scorecard: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  // Determine which tabs are available based on pipeline stage
  const showAdvancedTabs = true // Always show all tabs

  // Get stage-specific messaging
  const getStageMessage = (stage: PipelineStage) => {
    switch (stage) {
      case "Screening":
        return "Initial review and outreach"
      case "First Meeting":
        return "You can now add meeting notes and generate memos"
      case "IC1":
        return "Prepare materials for first IC review"
      case "DD":
        return "Conducting detailed due diligence"
      case "IC2":
        return "Final decision pending"
      case "Closing":
        return "Negotiating investment terms"
      case "Portfolio":
        return "Active portfolio company"
      default:
        return ""
    }
  }

  const getStageAction = (stage: PipelineStage) => {
    switch (stage) {
      case "Screening":
        return { label: "Schedule First Meeting", action: moveToNextStage }
      case "First Meeting":
        return { label: "Submit to IC1", action: moveToNextStage }
      case "IC1":
        return { label: "Begin Due Diligence", action: moveToNextStage }
      case "DD":
        return { label: "Submit to IC2", action: moveToNextStage }
      case "IC2":
        return { label: "Begin Closing", action: moveToNextStage }
      case "Closing":
        return { label: "Add to Portfolio", action: moveToNextStage }
      default:
        return null
    }
  }

  const moveToNextStage = () => {
    const stages: PipelineStage[] = [
      "Screening",
      "First Meeting",
      "IC1",
      "DD",
      "IC2",
      "Closing",
      "Portfolio",
    ]

    const currentIndex = stages.indexOf(currentStage)
    if (currentIndex < stages.length - 1) {
      const nextStage = stages[currentIndex + 1]
      setCurrentStage(nextStage)
    }
  }

  const stageAction = getStageAction(currentStage)

  // Helper component for displaying field data
  const DataField = ({ label, value, link }: { label: string; value?: string | number; link?: boolean }) => {
    return (
      <div className="space-y-1">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        {value ? (
          link && typeof value === "string" ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              {value}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <div className="text-sm font-medium line-clamp-2">{value}</div>
          )
        ) : (
          <div className="text-sm text-muted-foreground italic">Not provided</div>
        )}
      </div>
    )
  }

  // EditableDataField component for overview editing
  const EditableDataField = ({
    label,
    value,
    onChange,
    multiline = false,
  }: {
    label: string
    value: string | undefined
    onChange: (value: string) => void
    multiline?: boolean
  }) => {
    if (!isEditingOverview) {
      return <DataField label={label} value={value} />
    }

    return (
      <div className="space-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        {multiline ? (
          <Textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[100px]"
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        ) : (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackButton returnTo="dashboard" />
              <Breadcrumb
                items={[
                  { label: "Pipeline", href: "/" },
                  { label: startup.name },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg px-4 py-1">
                #{startup.rank}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Company Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-3">{startup.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{startup.sector}</Badge>
                <Badge variant="secondary">{startup.country}</Badge>
                <Badge className="bg-blue-600 hover:bg-blue-700">{startup.pipelineStage}</Badge>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">LLM Score</div>
                <div className="text-5xl font-bold text-blue-600">{startup.aiScores?.llm || startup.score}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">ML Score</div>
                <div className="text-5xl font-bold text-green-600">{startup.aiScores?.ml || startup.score}</div>
              </div>
              {startup.aiScores?.xgBoost && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">XG Boost</div>
                  <div className="text-5xl font-bold text-purple-600">{startup.aiScores.xgBoost}</div>
                </div>
              )}
              {startup.aiScores?.lightGBM && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">LightGBM</div>
                  <div className="text-5xl font-bold text-orange-600">{startup.aiScores.lightGBM}</div>
                </div>
              )}
            </div>
          </div>
          <p className="text-lg text-muted-foreground line-clamp-2">{startup.description}</p>
        </div>

        {/* Shortlist Tracking Card */}
        {shortlistedBy.length > 0 && (
          <Card className="p-6 mb-8 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-3">
                  Shortlisted by {shortlistedBy.length} {shortlistedBy.length === 1 ? "person" : "people"}
                </h3>
                <div className="space-y-2">
                  {shortlistedBy.map((user, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center font-semibold text-amber-700 dark:text-amber-300">
                        {user.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-amber-900 dark:text-amber-100">{user.userName}</div>
                        <div className="text-xs text-amber-700 dark:text-amber-300">
                          {new Date(user.shortlistedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Current Stage Card */}
        <Card className="p-6 mb-8 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Current Stage: {currentStage}
              </h2>
              <p className="text-blue-700 dark:text-blue-300">{getStageMessage(currentStage)}</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleGenerateMemo}
                size="lg"
                variant="outline"
                className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white bg-transparent"
              >
                <FileText className="h-5 w-5" />
                Generate Investment Memo
              </Button>
              {stageAction && (
                <Button onClick={stageAction.action} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  {stageAction.label}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Stage Navigation */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Pipeline Stage</h3>
            <Badge variant="outline" className="text-xs">
              {PIPELINE_STAGES.find(s => s.id === currentStage)?.description}
            </Badge>
          </div>
          <StageNavigation
            currentStage={currentStage}
            onStageChange={(stage) => setCurrentStage(stage)}
          />
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted p-1 flex-wrap h-auto gap-1">
            {/* Always visible */}
            <TabsTrigger value="overview">Overview</TabsTrigger>

            {/* Stage-specific tabs - only rendered when available */}
            {STAGE_TABS[currentStage]?.includes("assessment") && (
              <TabsTrigger value="assessment">Initial Assessment</TabsTrigger>
            )}
            {STAGE_TABS[currentStage]?.includes("scorecard") && (
              <TabsTrigger value="scorecard">Investment Scorecard</TabsTrigger>
            )}
            {STAGE_TABS[currentStage]?.includes("issues") && (
              <TabsTrigger value="issues">Threshold Issues</TabsTrigger>
            )}
            {STAGE_TABS[currentStage]?.includes("valuation") && (
              <TabsTrigger value="valuation">Valuation & Terms</TabsTrigger>
            )}
            {STAGE_TABS[currentStage]?.includes("legal") && (
              <TabsTrigger value="legal">Legal DD</TabsTrigger>
            )}
            {STAGE_TABS[currentStage]?.includes("decision") && (
              <TabsTrigger value="decision">IC Decision</TabsTrigger>
            )}
            {STAGE_TABS[currentStage]?.includes("rejection") && (
              <TabsTrigger value="rejection">Rejection</TabsTrigger>
            )}

            {/* Always visible */}
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Edit Overview Controls */}
            {!isEditingOverview ? (
              <div className="flex justify-end mb-4">
                <Button onClick={handleStartEditOverview} variant="outline" className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Edit Overview
                </Button>
              </div>
            ) : (
              <Card className="p-4 mb-4 bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-700 dark:text-blue-400">Editing Overview</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCancelEditOverview} variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button onClick={handleSaveOverview} disabled={isSavingOverview} size="sm">
                      {isSavingOverview ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* AI-Generated Scores */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6">AI-Generated Scores</h3>
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-6 border-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">LLM SCORE</div>
                  <div className="text-5xl font-bold text-blue-600 mb-4">{startup.aiScores?.llm || 0}</div>
                  <Progress value={startup.aiScores?.llm || 0} className="h-2" />
                </Card>
                <Card className="p-6 border-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">ML SCORE</div>
                  <div className="text-5xl font-bold text-green-600">{startup.aiScores?.ml || 0}</div>
                  <Progress value={startup.aiScores?.ml || 0} className="h-2" />
                </Card>
                {startup.aiScores?.xgBoost && (
                  <Card className="p-6 border-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">XG BOOST</div>
                    <div className="text-5xl font-bold text-purple-600 mb-4">{startup.aiScores.xgBoost}</div>
                    <Progress value={startup.aiScores.xgBoost} className="h-2" />
                  </Card>
                )}
                {startup.aiScores?.lightGBM && (
                  <Card className="p-6 border-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">LIGHTGBM V2</div>
                    <div className="text-5xl font-bold text-orange-600 mb-4">{startup.aiScores.lightGBM}</div>
                    <Progress value={startup.aiScores.lightGBM} className="h-2" />
                  </Card>
                )}
              </div>
            </Card>

            {/* Investment Analysis */}
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Investment Analysis</h3>
              <div className="space-y-6">
                <EditableDataField
                  label="Key Strengths"
                  value={isEditingOverview ? editableData.rationale.keyStrengths : startup.rationale?.keyStrengths}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      rationale: { ...prev.rationale, keyStrengths: value },
                    }))
                  }
                  multiline
                />
                <EditableDataField
                  label="Areas of Concern"
                  value={isEditingOverview ? editableData.rationale.areasOfConcern : startup.rationale?.areasOfConcern}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      rationale: { ...prev.rationale, areasOfConcern: value },
                    }))
                  }
                  multiline
                />
                <EditableDataField
                  label="Market & Competition Analysis"
                  value={
                    isEditingOverview
                      ? editableData.marketInfo.marketCompetitionAnalysis
                      : startup.marketInfo?.marketCompetitionAnalysis
                  }
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      marketInfo: { ...prev.marketInfo, marketCompetitionAnalysis: value },
                    }))
                  }
                  multiline
                />
                <EditableDataField
                  label="Team & Execution Assessment"
                  value={
                    isEditingOverview
                      ? editableData.teamInfo.teamExecutionAssessment
                      : startup.teamInfo?.teamExecutionAssessment
                  }
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      teamInfo: { ...prev.teamInfo, teamExecutionAssessment: value },
                    }))
                  }
                  multiline
                />
              </div>
            </Card>

            {/* Company Overview - CSV Fields 1-11 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Company Overview</h3>
              <div className="grid grid-cols-3 gap-6">
                <EditableDataField
                  label="Company"
                  value={isEditingOverview ? editableData.name : startup.name}
                  onChange={(value) => setEditableData((prev) => ({ ...prev, name: value }))}
                />
                <EditableDataField
                  label="Description"
                  value={isEditingOverview ? editableData.description : startup.description}
                  onChange={(value) => setEditableData((prev) => ({ ...prev, description: value }))}
                />
                <EditableDataField
                  label="Country"
                  value={isEditingOverview ? editableData.country : startup.country}
                  onChange={(value) => setEditableData((prev) => ({ ...prev, country: value }))}
                />
                <EditableDataField
                  label="Website"
                  value={isEditingOverview ? editableData.companyInfo.website : startup.companyInfo?.website}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, website: value },
                    }))
                  }
                />
                <EditableDataField
                  label="LinkedIn URL"
                  value={isEditingOverview ? editableData.companyInfo.linkedin : startup.companyInfo?.linkedin}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, linkedin: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Location"
                  value={isEditingOverview ? editableData.companyInfo.location : startup.companyInfo?.location}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, location: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Employee Size"
                  value={isEditingOverview ? editableData.companyInfo.employeeCount : startup.companyInfo?.employeeCount}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, employeeCount: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Area"
                  value={isEditingOverview ? editableData.companyInfo.area : startup.companyInfo?.area}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, area: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Venture Capital Firm"
                  value={
                    isEditingOverview
                      ? editableData.companyInfo.ventureCapitalFirm
                      : startup.companyInfo?.ventureCapitalFirm
                  }
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, ventureCapitalFirm: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Founding Year"
                  value={isEditingOverview ? editableData.companyInfo.founded : startup.companyInfo?.founded}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, founded: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Founders"
                  value={isEditingOverview ? editableData.companyInfo.founders : startup.companyInfo?.founders}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, founders: value },
                    }))
                  }
                />
              </div>
            </Card>

            {/* Team & Founders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Team & Founders</h3>
              <div className="space-y-4">
                <EditableDataField
                  label="Founders' Education"
                  value={isEditingOverview ? editableData.teamInfo.foundersEducation : startup.teamInfo?.foundersEducation}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      teamInfo: { ...prev.teamInfo, foundersEducation: value },
                    }))
                  }
                  multiline
                />
                <EditableDataField
                  label="Founders' Prior Experience"
                  value={isEditingOverview ? editableData.teamInfo.foundersPriorExperience : startup.teamInfo?.foundersPriorExperience}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      teamInfo: { ...prev.teamInfo, foundersPriorExperience: value },
                    }))
                  }
                  multiline
                />
                <EditableDataField
                  label="Key Team Members"
                  value={isEditingOverview ? editableData.teamInfo.keyTeamMembers : startup.teamInfo?.keyTeamMembers}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      teamInfo: { ...prev.teamInfo, keyTeamMembers: value },
                    }))
                  }
                  multiline
                />
                <EditableDataField
                  label="Team Depth"
                  value={isEditingOverview ? editableData.teamInfo.teamDepth : startup.teamInfo?.teamDepth}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      teamInfo: { ...prev.teamInfo, teamDepth: value },
                    }))
                  }
                  multiline
                />
                <EditableDataField
                  label="# Employees"
                  value={isEditingOverview ? editableData.companyInfo.employeeCount : startup.companyInfo?.employeeCount}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      companyInfo: { ...prev.companyInfo, employeeCount: value },
                    }))
                  }
                />
              </div>
            </Card>

            {/* Market & Industry */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Market & Industry</h3>
              <div className="grid grid-cols-2 gap-6">
                <EditableDataField
                  label="B2B or B2C"
                  value={isEditingOverview ? editableData.marketInfo.b2bOrB2c : startup.marketInfo?.b2bOrB2c}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      marketInfo: { ...prev.marketInfo, b2bOrB2c: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Sub-Industry"
                  value={isEditingOverview ? editableData.marketInfo.subIndustry : startup.marketInfo?.subIndustry}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      marketInfo: { ...prev.marketInfo, subIndustry: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Market Size"
                  value={isEditingOverview ? editableData.marketInfo.marketSize : startup.marketInfo?.marketSize}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      marketInfo: { ...prev.marketInfo, marketSize: value },
                    }))
                  }
                />
                <EditableDataField
                  label="AI Disruption Propensity"
                  value={isEditingOverview ? editableData.marketInfo.aiDisruptionPropensity : startup.marketInfo?.aiDisruptionPropensity}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      marketInfo: { ...prev.marketInfo, aiDisruptionPropensity: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Industry"
                  value={isEditingOverview ? editableData.marketInfo.industry : startup.marketInfo?.industry}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      marketInfo: { ...prev.marketInfo, industry: value },
                    }))
                  }
                />
                <EditableDataField
                  label="Target Persona"
                  value={isEditingOverview ? editableData.marketInfo.targetPersona : startup.marketInfo?.targetPersona}
                  onChange={(value) =>
                    setEditableData((prev) => ({
                      ...prev,
                      marketInfo: { ...prev.marketInfo, targetPersona: value },
                    }))
                  }
                />
              </div>
            </Card>

            {/* Sales & Go-to-Market */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Sales & Go-to-Market</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <EditableDataField
                    label="Sales Motion"
                    value={isEditingOverview ? editableData.salesInfo?.salesMotion : startup.salesInfo?.salesMotion}
                    onChange={(val) =>
                      setEditableData({
                        ...editableData,
                        salesInfo: { ...editableData.salesInfo, salesMotion: val },
                      })
                    }
                  />
                  <EditableDataField
                    label="Sales Cycle Length"
                    value={
                      isEditingOverview
                        ? editableData.salesInfo?.salesCycleLength
                        : startup.salesInfo?.salesCycleLength
                    }
                    onChange={(val) =>
                      setEditableData({
                        ...editableData,
                        salesInfo: { ...editableData.salesInfo, salesCycleLength: val },
                      })
                    }
                  />
                  <EditableDataField
                    label="Sales Complexity"
                    value={
                      isEditingOverview ? editableData.salesInfo?.salesComplexity : startup.salesInfo?.salesComplexity
                    }
                    onChange={(val) =>
                      setEditableData({
                        ...editableData,
                        salesInfo: { ...editableData.salesInfo, salesComplexity: val },
                      })
                    }
                  />
                </div>
                <EditableDataField
                  label="Go-to-Market Strategy"
                  value={isEditingOverview ? editableData.salesInfo?.gtmStrategy : startup.salesInfo?.gtmStrategy}
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      salesInfo: { ...editableData.salesInfo, gtmStrategy: val },
                    })
                  }
                  multiline
                />
                <EditableDataField
                  label="Channels"
                  value={isEditingOverview ? editableData.salesInfo?.channels : startup.salesInfo?.channels}
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      salesInfo: { ...editableData.salesInfo, channels: val },
                    })
                  }
                />
              </div>
            </Card>

            {/* Product */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <EditableDataField
                    label="Product Name"
                    value={isEditingOverview ? editableData.productInfo?.productName : startup.productInfo?.productName}
                    onChange={(val) =>
                      setEditableData({
                        ...editableData,
                        productInfo: { ...editableData.productInfo, productName: val },
                      })
                    }
                  />
                  <EditableDataField
                    label="Horizontal or Vertical"
                    value={
                      isEditingOverview
                        ? editableData.productInfo?.horizontalOrVertical
                        : startup.productInfo?.horizontalOrVertical
                    }
                    onChange={(val) =>
                      setEditableData({
                        ...editableData,
                        productInfo: { ...editableData.productInfo, horizontalOrVertical: val },
                      })
                    }
                  />
                </div>
                <EditableDataField
                  label="Problem Solved"
                  value={
                    isEditingOverview ? editableData.productInfo?.problemSolved : startup.productInfo?.problemSolved
                  }
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      productInfo: { ...editableData.productInfo, problemSolved: val },
                    })
                  }
                  multiline
                />
                <EditableDataField
                  label="Moat"
                  value={isEditingOverview ? editableData.productInfo?.moat : startup.productInfo?.moat}
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      productInfo: { ...editableData.productInfo, moat: val },
                    })
                  }
                  multiline
                />
              </div>
            </Card>

            {/* Business Model */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Business Model</h3>
              <div className="grid grid-cols-2 gap-6">
                <EditableDataField
                  label="Revenue Model"
                  value={
                    isEditingOverview
                      ? editableData.businessModelInfo?.revenueModel
                      : startup.businessModelInfo?.revenueModel
                  }
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      businessModelInfo: { ...editableData.businessModelInfo, revenueModel: val },
                    })
                  }
                />
                <EditableDataField
                  label="Pricing Strategy"
                  value={
                    isEditingOverview
                      ? editableData.businessModelInfo?.pricingStrategy
                      : startup.businessModelInfo?.pricingStrategy
                  }
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      businessModelInfo: { ...editableData.businessModelInfo, pricingStrategy: val },
                    })
                  }
                />
                <EditableDataField
                  label="Unit Economics"
                  value={
                    isEditingOverview
                      ? editableData.businessModelInfo?.unitEconomics
                      : startup.businessModelInfo?.unitEconomics
                  }
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      businessModelInfo: { ...editableData.businessModelInfo, unitEconomics: val },
                    })
                  }
                />
              </div>
            </Card>

            {/* Competitive Landscape */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Competitive Landscape</h3>
              <div className="grid grid-cols-2 gap-6">
                <EditableDataField
                  label="Competitors"
                  value={
                    isEditingOverview ? editableData.competitiveInfo?.competitors : startup.competitiveInfo?.competitors
                  }
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      competitiveInfo: { ...editableData.competitiveInfo, competitors: val },
                    })
                  }
                />
                <EditableDataField
                  label="Industry Multiples"
                  value={
                    isEditingOverview
                      ? editableData.competitiveInfo?.industryMultiples
                      : startup.competitiveInfo?.industryMultiples
                  }
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      competitiveInfo: { ...editableData.competitiveInfo, industryMultiples: val },
                    })
                  }
                />
              </div>
            </Card>

            {/* Risk & Opportunity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Risk & Opportunity</h3>
              <div className="grid grid-cols-2 gap-6">
                <EditableDataField
                  label="Regulatory Risk"
                  value={isEditingOverview ? editableData.riskInfo?.regulatoryRisk : startup.riskInfo?.regulatoryRisk}
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      riskInfo: { ...editableData.riskInfo, regulatoryRisk: val },
                    })
                  }
                />
                <EditableDataField
                  label="Exit Potential"
                  value={
                    isEditingOverview
                      ? editableData.opportunityInfo?.exitPotential
                      : startup.opportunityInfo?.exitPotential
                  }
                  onChange={(val) =>
                    setEditableData({
                      ...editableData,
                      opportunityInfo: { ...editableData.opportunityInfo, exitPotential: val },
                    })
                  }
                />
              </div>
            </Card>

            {/* Custom Data Section - Dynamic fields from CSV import */}
            {startup.customSchema && startup.customData && (
              <DynamicDataSection
                data={startup.customData as CustomData}
                schema={startup.customSchema as CustomSchema}
                isEditing={isEditingOverview}
                onUpdate={(newData) => {
                  // Update will be handled by save overview
                  setEditableData((prev) => ({
                    ...prev,
                    customData: newData,
                  }))
                }}
                className="mt-6"
              />
            )}
          </TabsContent>

          {/* Initial Assessment Tab */}
          <TabsContent value="assessment">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-semibold mb-2">Initial Assessment</h3>
                  <p className="text-sm text-muted-foreground">
                    Rate your first impressions across key investment criteria
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">Completion</div>
                  <div className="text-3xl font-bold text-primary">{getAssessmentCompletion()}%</div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Market Opportunity */}
                <Card className="p-6 border-2">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-1">Market Opportunity</h4>
                    <p className="text-sm text-muted-foreground">
                      How large and attractive is the target market? Consider market size, growth rate, and timing.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setAssessmentScores({ ...assessmentScores, marketOpportunity: score })}
                        className={`flex-1 h-12 rounded-lg font-semibold transition-all ${
                          assessmentScores.marketOpportunity === score
                            ? "ring-2 ring-primary ring-offset-2 scale-105 " + getScoreColor(score)
                            : assessmentScores.marketOpportunity > 0
                              ? "bg-muted text-muted-foreground hover:bg-muted/80"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Weak</span>
                    <Badge className={getScoreColor(assessmentScores.marketOpportunity)}>
                      {getScoreLabel(assessmentScores.marketOpportunity)}
                    </Badge>
                    <span className="text-muted-foreground">Strong</span>
                  </div>
                </Card>

                {/* Team Quality */}
                <Card className="p-6 border-2">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-1">Team Quality</h4>
                    <p className="text-sm text-muted-foreground">
                      How strong is the founding team? Consider experience, domain expertise, and execution ability.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setAssessmentScores({ ...assessmentScores, teamQuality: score })}
                        className={`flex-1 h-12 rounded-lg font-semibold transition-all ${
                          assessmentScores.teamQuality === score
                            ? "ring-2 ring-primary ring-offset-2 scale-105 " + getScoreColor(score)
                            : assessmentScores.teamQuality > 0
                              ? "bg-muted text-muted-foreground hover:bg-muted/80"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Weak</span>
                    <Badge className={getScoreColor(assessmentScores.teamQuality)}>
                      {getScoreLabel(assessmentScores.teamQuality)}
                    </Badge>
                    <span className="text-muted-foreground">Strong</span>
                  </div>
                </Card>

                {/* Product Innovation */}
                <Card className="p-6 border-2">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-1">Product Innovation</h4>
                    <p className="text-sm text-muted-foreground">
                      How innovative and differentiated is the product? Consider uniqueness, technology, and IP.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setAssessmentScores({ ...assessmentScores, productInnovation: score })}
                        className={`flex-1 h-12 rounded-lg font-semibold transition-all ${
                          assessmentScores.productInnovation === score
                            ? "ring-2 ring-primary ring-offset-2 scale-105 " + getScoreColor(score)
                            : assessmentScores.productInnovation > 0
                              ? "bg-muted text-muted-foreground hover:bg-muted/80"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Weak</span>
                    <Badge className={getScoreColor(assessmentScores.productInnovation)}>
                      {getScoreLabel(assessmentScores.productInnovation)}
                    </Badge>
                    <span className="text-muted-foreground">Strong</span>
                  </div>
                </Card>

                {/* Business Model */}
                <Card className="p-6 border-2">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-1">Business Model</h4>
                    <p className="text-sm text-muted-foreground">
                      How viable is the business model? Consider revenue potential, unit economics, and scalability.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setAssessmentScores({ ...assessmentScores, businessModel: score })}
                        className={`flex-1 h-12 rounded-lg font-semibold transition-all ${
                          assessmentScores.businessModel === score
                            ? "ring-2 ring-primary ring-offset-2 scale-105 " + getScoreColor(score)
                            : assessmentScores.businessModel > 0
                              ? "bg-muted text-muted-foreground hover:bg-muted/80"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Weak</span>
                    <Badge className={getScoreColor(assessmentScores.businessModel)}>
                      {getScoreLabel(assessmentScores.businessModel)}
                    </Badge>
                    <span className="text-muted-foreground">Strong</span>
                  </div>
                </Card>

                {/* Competitive Position */}
                <Card className="p-6 border-2">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-1">Competitive Position</h4>
                    <p className="text-sm text-muted-foreground">
                      How defensible is the competitive position? Consider moat, barriers to entry, and market dynamics.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        onClick={() => setAssessmentScores({ ...assessmentScores, competitivePosition: score })}
                        className={`flex-1 h-12 rounded-lg font-semibold transition-all ${
                          assessmentScores.competitivePosition === score
                            ? "ring-2 ring-primary ring-offset-2 scale-105 " + getScoreColor(score)
                            : assessmentScores.competitivePosition > 0
                              ? "bg-muted text-muted-foreground hover:bg-muted/80"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Weak</span>
                    <Badge className={getScoreColor(assessmentScores.competitivePosition)}>
                      {getScoreLabel(assessmentScores.competitivePosition)}
                    </Badge>
                    <span className="text-muted-foreground">Strong</span>
                  </div>
                </Card>

                {/* Commentary */}
                <Card className="p-6 border-2">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-1">Overall Commentary</h4>
                    <p className="text-sm text-muted-foreground">
                      Share your initial thoughts, key observations, and any concerns or excitement about this
                      opportunity.
                    </p>
                  </div>
                  <textarea
                    value={assessmentCommentary}
                    onChange={(e) => setAssessmentCommentary(e.target.value)}
                    className="w-full p-4 border border-border rounded-lg bg-background min-h-[150px] focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Your initial impressions and key takeaways..."
                  />
                </Card>

                {/* Save Button */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" size="lg">
                    Save as Draft
                  </Button>
                  <Button onClick={handleSaveAssessment} size="lg" className="bg-blue-600 hover:bg-blue-700">
                    Save Assessment
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Investment Scorecard Tab */}
          <TabsContent value="scorecard">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Investment Scorecard</h3>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total Score</div>
                  <div className="text-3xl font-bold text-primary">{calculateTotalScore()}</div>
                </div>
              </div>

              {/* Editing Indicator */}
              {editingScorecardIndex !== null && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-300 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-700 dark:text-blue-400">
                      Editing Scorecard by {savedScorecards[editingScorecardIndex]?.reviewerName}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    Make your changes below and click "Update Scorecard" to save, or "Cancel Edit" to discard
                    changes.
                  </p>
                </div>
              )}

              {/* Reviewer Name Input */}
              <div className="mb-6 bg-muted/50 border border-border rounded-lg p-4">
                <Label htmlFor="reviewer-name" className="text-sm font-medium mb-2 block">
                  Your Name
                </Label>
                <Input
                  id="reviewer-name"
                  type="text"
                  placeholder="Enter your name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Your scorecard will be saved and visible to all team members
                </p>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Score each criterion from 1-10 based on the guiding questions and descriptions below.
              </p>
              <div className="space-y-8">
                {Object.entries(
                  SCORECARD_TEMPLATE.reduce(
                    (acc, criterion) => {
                      if (!acc[criterion.section]) {
                        acc[criterion.section] = []
                      }
                      acc[criterion.section].push(criterion)
                      return acc
                    },
                    {} as Record<string, (typeof SCORECARD_TEMPLATE)[number][]>,
                  ),
                ).map(([sectionName, criteria]) => (
                  <div key={sectionName}>
                    <h4 className="text-lg font-semibold mb-4 text-blue-600">{sectionName}</h4>
                    <div className="space-y-6">
                      {criteria.map((criterion, idx) => {
                        const key = `${criterion.section}-${criterion.criterion}`
                        const score = scorecardScores[key] || 0
                        return (
                          <Card key={idx} className="p-4 border-2">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h5 className="font-semibold mb-1">{criterion.criterion}</h5>
                                <p className="text-sm text-muted-foreground italic">{criterion.guidingQuestions}</p>
                              </div>
                              <div className="ml-4 flex items-center gap-3">
                                <div className="flex items-center gap-3">
                                  <Input
                                    type="number"
                                    value={score}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0
                                      const clampedValue = Math.max(0, Math.min(10, value))
                                      handleScoreChange(criterion.section, criterion.criterion, clampedValue)
                                    }}
                                    min={0}
                                    max={10}
                                    step={1}
                                    className="w-20 text-center"
                                  />
                                  <div className="text-sm text-muted-foreground">/ 10</div>
                                </div>
                                <Badge variant="outline" className="ml-2">
                                  {criterion.weight}%
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-900">
                                <div className="font-medium text-red-700 dark:text-red-300 mb-1">Low (1-3)</div>
                                <p className="text-muted-foreground">{criterion.low}</p>
                              </div>
                              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-900">
                                <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                                  Medium (4-6)
                                </div>
                                <p className="text-muted-foreground">{criterion.medium}</p>
                              </div>
                              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900">
                                <div className="font-medium text-green-700 dark:text-green-300 mb-1">High (7-10)</div>
                                <p className="text-muted-foreground">{criterion.high}</p>
                              </div>
                            </div>
                            {score > 0 && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                                <div className="text-sm">
                                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                                    Current Assessment:
                                  </span>{" "}
                                  <span className="text-muted-foreground">{getScoreDescription(score, criterion)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Weighted contribution: {((score / 10) * criterion.weight).toFixed(1)} points
                                </div>
                              </div>
                            )}
                            <div className="mt-3">
                              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                                Comments / Notes
                              </label>
                              <Textarea
                                value={scorecardComments[key] || ""}
                                onChange={(e) => {
                                  setScorecardComments((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }}
                                placeholder="Add your notes or reasoning for this score..."
                                className="min-h-[80px] resize-y"
                              />
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 bg-primary/10 border border-primary/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total Weighted Score</div>
                    <div className="text-4xl font-bold text-primary">{calculateTotalScore()} / 100</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground mb-2">Score Breakdown</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {Object.entries(
                        SCORECARD_TEMPLATE.reduce(
                          (acc, criterion) => {
                            if (!acc[criterion.section]) {
                              acc[criterion.section] = { total: 0, weight: 0 }
                            }
                            const key = `${criterion.section}-${criterion.criterion}`
                            const score = scorecardScores[key] || 0
                            acc[criterion.section].total += (score / 10) * criterion.weight
                            acc[criterion.section].weight += criterion.weight
                            return acc
                          },
                          {} as Record<string, { total: number; weight: number }>,
                        ),
                      ).map(([section, data]) => (
                        <div key={section} className="flex justify-between gap-4">
                          <span>{section}:</span>
                          <span className="font-semibold">
                            {data.total.toFixed(1)} / {data.weight}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-8 flex justify-end gap-3">
                {editingScorecardIndex !== null && (
                  <Button onClick={handleCancelEdit} variant="outline" size="lg" className="px-8">
                    Cancel Edit
                  </Button>
                )}
                <Button onClick={handleSaveScorecard} disabled={isSavingScorecard} size="lg" className="px-8">
                  {isSavingScorecard
                    ? "Saving..."
                    : editingScorecardIndex !== null
                      ? "Update Scorecard"
                      : "Save Scorecard"}
                </Button>
              </div>

              {/* Saved Scorecards Section */}
              {savedScorecards.length > 0 && (
                <div className="mt-12 border-t pt-8">
                  <h4 className="text-lg font-semibold mb-6">
                    Saved Scorecards ({savedScorecards.length})
                  </h4>
                  <div className="space-y-6">
                    {savedScorecards
                      .slice()
                      .reverse()
                      .map((scorecard, index) => {
                        const actualIndex = savedScorecards.length - 1 - index
                        return (
                          <Card key={actualIndex} className="p-6 bg-muted/30">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <div className="flex items-center gap-3 mb-2">
                                  <h5 className="font-semibold text-lg">{scorecard.reviewerName}</h5>
                                  <Badge variant="outline" className="text-sm">
                                    Score: {scorecard.totalScore} / 100
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(scorecard.lastUpdated).toLocaleString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <div className="flex items-start gap-4">
                                <div className="text-right">
                                  <div
                                    className={`text-4xl font-bold ${
                                      scorecard.totalScore >= 70
                                        ? "text-green-600"
                                        : scorecard.totalScore >= 50
                                          ? "text-yellow-600"
                                          : "text-red-600"
                                    }`}
                                  >
                                    {scorecard.totalScore}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditScorecard(actualIndex)}
                                    className="text-muted-foreground hover:text-blue-600"
                                    title="Edit scorecard"
                                  >
                                    <Pencil className="h-5 w-5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteScorecard(actualIndex)}
                                    className="text-muted-foreground hover:text-destructive"
                                    title="Delete scorecard"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Section Breakdown with Comments */}
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium text-muted-foreground mb-4">
                                Score Breakdown with Commentary
                              </p>
                              <div className="space-y-4">
                                {Object.entries(
                                  SCORECARD_TEMPLATE.reduce(
                                    (acc, criterion) => {
                                      if (!acc[criterion.section]) {
                                        acc[criterion.section] = {
                                          total: 0,
                                          weight: 0,
                                          criteria: [],
                                          comments: [],
                                        }
                                      }
                                      const key = `${criterion.section}-${criterion.criterion}`
                                      const score = scorecard.scores[key] || 0
                                      acc[criterion.section].total += (score / 10) * criterion.weight
                                      acc[criterion.section].weight += criterion.weight

                                      // Store individual criterion with its score and comment
                                      const comment =
                                        scorecard.comments && scorecard.comments[key] ? scorecard.comments[key] : null

                                      acc[criterion.section].criteria.push({
                                        name: criterion.criterion,
                                        score,
                                        weight: criterion.weight,
                                        comment: comment && comment.trim() ? comment : null,
                                      })

                                      return acc
                                    },
                                    {} as Record<
                                      string,
                                      {
                                        total: number
                                        weight: number
                                        criteria: {
                                          name: string
                                          score: number
                                          weight: number
                                          comment: string | null
                                        }[]
                                        comments: { criterion: string; comment: string }[]
                                      }
                                    >,
                                  ),
                                ).map(([section, data]) => (
                                  <div key={section} className="border rounded-lg p-4 bg-background">
                                    {/* Section Header with Total Score */}
                                    <div className="flex justify-between items-center mb-4 pb-3 border-b">
                                      <span className="text-base font-semibold">{section}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xl font-bold text-primary">{data.total.toFixed(1)}</span>
                                        <span className="text-sm text-muted-foreground">/ {data.weight}</span>
                                      </div>
                                    </div>

                                    {/* Individual Criteria with Scores and Comments */}
                                    <div className="space-y-3">
                                      {data.criteria.map((criterion, idx) => (
                                        <div key={idx} className="pl-3 border-l-2 border-muted">
                                          {/* Criterion Name and Score */}
                                          <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium">{criterion.name}</span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-sm font-semibold">{criterion.score}</span>
                                              <span className="text-xs text-muted-foreground">/ 10</span>
                                            </div>
                                          </div>

                                          {/* Criterion Comment */}
                                          {criterion.comment && (
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                                              {criterion.comment}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Threshold Issues Tab */}
          <TabsContent value="issues">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Threshold Issues</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateIssues}
                    disabled={isGeneratingIssues}
                    size="sm"
                    variant="outline"
                  >
                    {isGeneratingIssues ? "Generating..." : "Generate from Scorecard"}
                  </Button>
                  <Button onClick={() => setShowIssueForm(true)} size="sm">
                    Add Issue
                  </Button>
                </div>
              </div>

              {showIssueForm && (
                <div className="bg-muted border border-border rounded-lg p-4 mb-6">
                  {editingIssueId && (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-800 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-blue-700 dark:text-blue-400">Editing Threshold Issue</span>
                      </div>
                    </div>
                  )}
                  <h4 className="font-semibold mb-4">{editingIssueId ? "Edit Issue" : "Add New Issue"}</h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-1 block" htmlFor="issue-category">
                        Category
                      </Label>
                      <Select
                        value={newIssue.category}
                        onValueChange={(value) =>
                          setNewIssue({ ...newIssue, category: value as ThresholdIssue["category"] })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Market Risk">Market Risk</SelectItem>
                          <SelectItem value="Team Risk">Team Risk</SelectItem>
                          <SelectItem value="Technology Risk">Technology Risk</SelectItem>
                          <SelectItem value="Legal Risk">Legal Risk</SelectItem>
                          <SelectItem value="Financial Risk">Financial Risk</SelectItem>
                          <SelectItem value="Competitive Risk">Competitive Risk</SelectItem>
                          <SelectItem value="Execution Risk">Execution Risk</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1 block" htmlFor="issue-description">
                        Issue Description
                      </Label>
                      <Textarea
                        value={newIssue.issue}
                        onChange={(e) => setNewIssue({ ...newIssue, issue: e.target.value })}
                        id="issue-description"
                        className="w-full"
                        placeholder="Describe the issue..."
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1 block" htmlFor="issue-risk-rating">
                        Risk Rating
                      </Label>
                      <Select
                        value={newIssue.riskRating}
                        onValueChange={(value) =>
                          setNewIssue({ ...newIssue, riskRating: value as ThresholdIssue["riskRating"] })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select risk rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1 block" htmlFor="issue-mitigation">
                        Mitigation Strategy
                      </Label>
                      <Textarea
                        value={newIssue.mitigation}
                        onChange={(e) => setNewIssue({ ...newIssue, mitigation: e.target.value })}
                        id="issue-mitigation"
                        className="w-full"
                        placeholder="How can this risk be mitigated?"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1 block" htmlFor="issue-status">
                        Status
                      </Label>
                      <Select
                        value={newIssue.status}
                        onValueChange={(value) =>
                          setNewIssue({ ...newIssue, status: value as ThresholdIssue["status"] })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                          <SelectItem value="Accepted Risk">Accepted Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveIssue} disabled={isSavingIssue} size="sm">
                        {isSavingIssue ? "Saving..." : editingIssueId ? "Update Issue" : "Save Issue"}
                      </Button>
                      <Button onClick={handleCancelEditIssue} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {thresholdIssues && thresholdIssues.length > 0 ? (
                  thresholdIssues.map((issue, index) => (
                    <div key={index} className="bg-muted border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline">{issue.category}</Badge>
                          <Badge className={getRiskColor(issue.riskRating)}>{issue.riskRating} Risk</Badge>
                          <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
                          {issue.source === "AI" && (
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {issue.identifiedDate && (
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              Identified: {issue.identifiedDate}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditIssue(issue)}
                              className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                              title="Edit issue"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteIssue(issue.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Delete issue"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm font-semibold text-foreground">Issue</div>
                          <div className="text-sm text-muted-foreground">{issue.issue}</div>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">Mitigation</div>
                          <div className="text-sm text-muted-foreground">{issue.mitigation}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No threshold issues recorded yet</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Valuation & Terms Tab */}
          <TabsContent value="valuation">
            <ValuationTermsComponent
              data={startup?.valuationData as ValuationData | undefined}
              onSave={async (valuationData) => {
                try {
                  const response = await fetch(`/api/startups/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ valuationData }),
                  })
                  if (!response.ok) throw new Error("Failed to save valuation data")
                  const updatedStartup = await response.json()
                  setStartup(updatedStartup)
                } catch (error) {
                  console.error("Error saving valuation data:", error)
                  alert("Failed to save valuation data")
                }
              }}
            />
          </TabsContent>

          {/* Legal Diligence Tab */}
          <TabsContent value="legal">
            <LegalDiligenceComponent
              data={startup?.legalDiligence as LegalDiligenceData | undefined}
              startupId={id}
              onSave={async (legalData) => {
                try {
                  const response = await fetch(`/api/startups/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ legalDiligence: legalData }),
                  })
                  if (!response.ok) throw new Error("Failed to save legal diligence data")
                  const updatedStartup = await response.json()
                  setStartup(updatedStartup)
                } catch (error) {
                  console.error("Error saving legal diligence data:", error)
                  alert("Failed to save legal diligence data")
                }
              }}
            />
          </TabsContent>

          {/* Investment Decision Tab */}
          <TabsContent value="decision">
            <InvestmentDecisionComponent
              decision={startup?.investmentDecision as InvestmentDecision | undefined}
              companyName={startup?.name || ""}
              onSave={async (decisionData) => {
                try {
                  const response = await fetch(`/api/startups/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ investmentDecision: decisionData }),
                  })
                  if (!response.ok) throw new Error("Failed to save decision")
                  // Refresh the startup data
                  const updatedStartup = await response.json()
                  setStartup(updatedStartup)
                } catch (error) {
                  console.error("Error saving investment decision:", error)
                  alert("Failed to save investment decision")
                }
              }}
            />
          </TabsContent>

          {/* Rejection Emails Tab */}
          <TabsContent value="rejection">
            <RejectionEmailsComponent startup={startup!} />
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6">Documents</h3>
              <div className="space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Meeting Transcript</h4>
                    <Button onClick={() => setShowTranscriptInput(!showTranscriptInput)} size="sm">
                      {showTranscriptInput ? "Cancel" : "Add Transcript"}
                    </Button>
                  </div>

                  {showTranscriptInput && (
                    <div className="bg-muted border border-border rounded-lg p-4 mb-4">
                      <Textarea
                        value={transcriptText}
                        onChange={(e) => setTranscriptText(e.target.value)}
                        className="w-full min-h-[200px] mb-2"
                        placeholder="Paste meeting transcript here..."
                      />
                      <Button onClick={handleUploadTranscript} size="sm">
                        Upload Transcript
                      </Button>
                    </div>
                  )}

                  {startup.documents?.transcript ? (
                    <div className="bg-muted border border-border rounded-lg p-3">
                      <div className="text-sm font-medium">Transcript Available</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {typeof startup.documents.transcript === "string"
                          ? startup.documents.transcript.substring(0, 150) + "..."
                          : startup.documents.transcript.fileName || "transcript.txt"}
                      </div>
                      {typeof startup.documents.transcript === "object" &&
                        startup.documents.transcript.uploadedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Uploaded: {new Date(startup.documents.transcript.uploadedAt).toLocaleString()}
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No transcript uploaded yet</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Pitch Deck</h4>
                    <Button onClick={() => setShowPitchDeckInput(!showPitchDeckInput)} size="sm">
                      {showPitchDeckInput ? "Cancel" : "Add Pitch Deck"}
                    </Button>
                  </div>

                  {showPitchDeckInput && (
                    <div className="bg-muted border border-border rounded-lg p-4 mb-4">
                      <Input type="file" accept=".pdf" onChange={handlePitchDeckFileChange} className="w-full mb-2" />
                      <Button onClick={handleUploadPitchDeckFile} size="sm" disabled={!pitchDeckFile}>
                        Upload Pitch Deck
                      </Button>
                    </div>
                  )}

                  {startup.documents?.pitchDeck ? (
                    <div className="bg-muted border border-border rounded-lg p-3">
                      <div className="text-sm font-medium">Pitch Deck Available</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {typeof startup.documents.pitchDeck === "string"
                          ? "PDF document uploaded"
                          : startup.documents.pitchDeck.fileName || "pitch_deck.pdf"}
                      </div>
                      {typeof startup.documents.pitchDeck === "object" &&
                        startup.documents.pitchDeck.uploadedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Uploaded: {new Date(startup.documents.pitchDeck.uploadedAt).toLocaleString()}
                          </div>
                        )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No pitch deck uploaded yet</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Investment Memo</h4>
                    <Button onClick={() => router.push(`/company/${id}/memo`)} size="sm" variant="default">
                      {startup.investmentMemo ? "View Memo" : "Generate Memo"}
                    </Button>
                  </div>

                  {startup.investmentMemo && typeof startup.investmentMemo === "object" ? (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Memo Generated</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Generated: {new Date((startup.investmentMemo as any).generatedAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        Comprehensive investment analysis with 10 sections including executive summary, market analysis, team assessment, and investment recommendation.
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No investment memo generated yet</p>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Outreach Tab */}
          <TabsContent value="outreach">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">Founder Outreach Messages</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI-generated personalized messages for founder outreach
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Label htmlFor="tone" className="text-sm font-medium">Tone:</Label>
                  <Select value={outreachTone} onValueChange={(value: OutreachTone) => setOutreachTone(value)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleGenerateOutreach}
                  disabled={isGeneratingOutreach}
                  className="gap-2"
                >
                  {isGeneratingOutreach ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Generate Messages
                    </>
                  )}
                </Button>
              </div>

              {/* Generated Messages */}
              {outreachMessages && (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Cold Email */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold">Cold Email</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyMessage("coldEmail", `Subject: ${outreachMessages.coldEmail.subject}\n\n${outreachMessages.coldEmail.body}`)}
                        className="gap-1"
                      >
                        {copiedMessageType === "coldEmail" ? (
                          <>
                            <Check className="h-3 w-3 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Subject:</div>
                      <div className="text-sm font-medium mb-3">{outreachMessages.coldEmail.subject}</div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Body:</div>
                      <div className="text-sm whitespace-pre-wrap">{outreachMessages.coldEmail.body}</div>
                    </div>
                  </div>

                  {/* LinkedIn Message */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold">LinkedIn Message</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyMessage("linkedin", outreachMessages.linkedin.body)}
                        className="gap-1"
                      >
                        {copiedMessageType === "linkedin" ? (
                          <>
                            <Check className="h-3 w-3 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded p-3">
                      <div className="text-sm whitespace-pre-wrap">{outreachMessages.linkedin.body}</div>
                    </div>
                  </div>

                  {/* Follow-up Email */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-orange-600" />
                        <h4 className="font-semibold">Follow-up Email</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyMessage("followUp", `Subject: ${outreachMessages.followUp.subject}\n\n${outreachMessages.followUp.body}`)}
                        className="gap-1"
                      >
                        {copiedMessageType === "followUp" ? (
                          <>
                            <Check className="h-3 w-3 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Subject:</div>
                      <div className="text-sm font-medium mb-3">{outreachMessages.followUp.subject}</div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Body:</div>
                      <div className="text-sm whitespace-pre-wrap">{outreachMessages.followUp.body}</div>
                    </div>
                  </div>

                  {/* Meeting Request */}
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <h4 className="font-semibold">Meeting Request</h4>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyMessage("meetingRequest", `Subject: ${outreachMessages.meetingRequest.subject}\n\n${outreachMessages.meetingRequest.body}`)}
                        className="gap-1"
                      >
                        {copiedMessageType === "meetingRequest" ? (
                          <>
                            <Check className="h-3 w-3 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded p-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Subject:</div>
                      <div className="text-sm font-medium mb-3">{outreachMessages.meetingRequest.subject}</div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Body:</div>
                      <div className="text-sm whitespace-pre-wrap">{outreachMessages.meetingRequest.body}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!outreachMessages && !isGeneratingOutreach && (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No messages generated yet</p>
                  <p className="text-sm">Select a tone and click "Generate Messages" to create personalized outreach messages</p>
                </div>
              )}

              {/* Loading state */}
              {isGeneratingOutreach && (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-lg font-medium mb-2">Generating outreach messages...</p>
                  <p className="text-sm text-muted-foreground">Creating personalized messages based on company profile</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <InvestmentMemoDialog
        open={memoDialogOpen}
        onOpenChange={setMemoDialogOpen}
        companyName={memoCompanyName}
        memoContent={currentMemo}
      />
    </div>
  )
}
