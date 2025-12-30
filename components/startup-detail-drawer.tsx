"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { Startup, PipelineStage } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerClose } from "@/components/ui/drawer"
import { X } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { SCORECARD_TEMPLATE } from "@/lib/scorecard-template"

interface StartupDetailDrawerProps {
  startup: Startup | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddFeedback: (
    startupId: string,
    scores: {
      team: number
      market: number
      product: number
      businessModel: number
      traction: number
      investmentReadiness: number
    },
    notes: string,
  ) => void
  onSaveInitialAssessment?: (
    startupId: string,
    assessment: {
      marketOpportunity: number
      teamQuality: number
      productInnovation: number
      businessModel: number
      competitivePosition: number
      commentary: string
    },
  ) => void
  onUploadDocument?: (startupId: string, docType: "transcript" | "pitchDeck", content: string) => void
  onGenerateMemo?: (startupId: string) => void
  onUpdateStage?: (startupId: string, newStage: PipelineStage) => void
  onRegenerateScores?: (startupId: string) => void
  onGenerateReport?: (startupId: string) => void
  onAddThresholdMeeting?: (
    startupId: string,
    meeting: {
      date: Date
      meetingType: "First Meeting" | "Follow-up" | "Partner Meeting" | "Due Diligence" | "Final Review" | "Other"
      attendees: string
      keyPoints: string
      decision: "Proceed" | "Pass" | "More Info Needed"
      actionItems: string
      nextSteps: string
    },
  ) => void
  onAddThresholdIssue?: (
    startupId: string,
    issue: {
      category:
        | "Market Risk"
        | "Team Risk"
        | "Technology Risk"
        | "Legal Risk"
        | "Financial Risk"
        | "Competitive Risk"
        | "Execution Risk"
        | "Other"
      issue: string
      riskRating: "High" | "Medium" | "Low"
      mitigation: string
      status: "Open" | "In Progress" | "Resolved" | "Accepted Risk"
    },
  ) => void
  onUpdateThresholdIssue?: (
    startupId: string,
    issueId: string,
    updates: {
      issue?: string
      riskRating?: "High" | "Medium" | "Low"
      mitigation?: string
      status?: "Open" | "In Progress" | "Resolved" | "Accepted Risk"
    },
  ) => void
  onDataRefresh?: () => void
}

export function StartupDetailDrawer({
  startup,
  open,
  onOpenChange,
  onAddFeedback,
  onSaveInitialAssessment,
  onUploadDocument,
  onGenerateMemo,
  onUpdateStage,
  onRegenerateScores,
  onGenerateReport,
  onAddThresholdMeeting,
  onAddThresholdIssue,
  onUpdateThresholdIssue,
  onDataRefresh,
}: StartupDetailDrawerProps) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [pitchDeck, setPitchDeck] = useState("")
  const [showTranscriptInput, setShowTranscriptInput] = useState(false)
  const [showPitchDeckInput, setShowPitchDeckInput] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null)

  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingForm, setMeetingForm] = useState({
    date: new Date().toISOString().split("T")[0],
    meetingType: "First Meeting" as
      | "First Meeting"
      | "Follow-up"
      | "Partner Meeting"
      | "Due Diligence"
      | "Final Review"
      | "Other",
    attendees: "",
    keyPoints: "",
    decision: "More Info Needed" as "Proceed" | "Pass" | "More Info Needed",
    actionItems: "",
    nextSteps: "",
  })

  const [showIssueForm, setShowIssueForm] = useState(false)
  const [issueForm, setIssueForm] = useState({
    category: "Market Risk" as
      | "Market Risk"
      | "Team Risk"
      | "Technology Risk"
      | "Legal Risk"
      | "Financial Risk"
      | "Competitive Risk"
      | "Execution Risk"
      | "Other",
    issue: "",
    riskRating: "Medium" as "High" | "Medium" | "Low",
    mitigation: "",
    status: "Open" as "Open" | "In Progress" | "Resolved" | "Accepted Risk",
  })

  const [initialAssessment, setInitialAssessment] = useState({
    marketOpportunity: startup?.initialAssessment?.marketOpportunity || 5,
    teamQuality: startup?.initialAssessment?.teamQuality || 5,
    productInnovation: startup?.initialAssessment?.productInnovation || 5,
    businessModel: startup?.initialAssessment?.businessModel || 5,
    competitivePosition: startup?.initialAssessment?.competitivePosition || 5,
    commentary: startup?.initialAssessment?.commentary || "",
  })

  // Sync initialAssessment state when startup prop changes
  useEffect(() => {
    if (startup) {
      setInitialAssessment({
        marketOpportunity: startup.initialAssessment?.marketOpportunity || 5,
        teamQuality: startup.initialAssessment?.teamQuality || 5,
        productInnovation: startup.initialAssessment?.productInnovation || 5,
        businessModel: startup.initialAssessment?.businessModel || 5,
        competitivePosition: startup.initialAssessment?.competitivePosition || 5,
        commentary: startup.initialAssessment?.commentary || "",
      })
    }
  }, [startup?.id])

  const [scorecardScores, setScorecardScores] = useState<Record<string, number>>(() => {
    const initialScores: Record<string, number> = {}
    if (startup?.investmentScorecard?.criteria) {
      startup.investmentScorecard.criteria.forEach((criterion) => {
        const key = `${criterion.section}-${criterion.criterion}`
        initialScores[key] = criterion.score || 0
      })
    }
    return initialScores
  })

  if (!startup || !open) return null

  const formatScore = (score?: number) => {
    if (score === undefined) return "N/A"
    return score.toFixed(1)
  }

  const getScoreLabel = (score?: number) => {
    if (!score) return "Not Scored"
    if (score >= 80) return "Excellent"
    if (score >= 60) return "Good"
    if (score >= 40) return "Fair"
    return "Needs Improvement"
  }

  const handleSubmitFeedback = (
    scores: {
      team: number
      market: number
      product: number
      businessModel: number
      traction: number
      investmentReadiness: number
    },
    notes: string,
  ) => {
    onAddFeedback(startup.id, scores, notes)
    setShowFeedbackForm(false)
  }

  const handleSaveInitialAssessment = () => {
    if (onSaveInitialAssessment) {
      onSaveInitialAssessment(startup.id, initialAssessment)
    }
  }

  const handleUploadTranscript = async () => {
    if (!transcript.trim()) return

    try {
      console.log("[Upload] Uploading transcript text")

      const formData = new FormData()
      formData.append("startupId", startup.id)
      formData.append("docType", "transcript")
      formData.append("textContent", transcript)

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

      // Reset state
      setTranscript("")
      setShowTranscriptInput(false)

      // Refresh startup data via callback instead of hard page reload
      if (onDataRefresh) {
        onDataRefresh()
      }
    } catch (error) {
      console.error("[Upload] Error uploading transcript:", error)
      alert(`Failed to upload transcript: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const handlePitchDeckFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setPitchDeckFile(file)
    }
  }

  const handleUploadPitchDeck = () => {
    if (pitchDeck.trim() && onUploadDocument) {
      onUploadDocument(startup.id, "pitchDeck", pitchDeck)
      setPitchDeck("")
      setShowPitchDeckInput(false)
    }
  }

  const handleUploadPitchDeckFile = async () => {
    if (!pitchDeckFile) return

    try {
      console.log("[Upload] Uploading PDF pitch deck:", pitchDeckFile.name)

      const formData = new FormData()
      formData.append("startupId", startup.id)
      formData.append("docType", "pitchDeck")
      formData.append("file", pitchDeckFile)

      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload pitch deck")
      }

      const result = await response.json()
      console.log("[Upload] Pitch deck uploaded successfully:", result)

      // Reset state
      setPitchDeckFile(null)
      setShowPitchDeckInput(false)

      // Refresh startup data via callback instead of hard page reload
      if (onDataRefresh) {
        onDataRefresh()
      }
    } catch (error) {
      console.error("[Upload] Error uploading pitch deck:", error)
      alert(`Failed to upload pitch deck: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const getNextStage = (currentStage: PipelineStage): PipelineStage | null => {
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
    if (currentIndex === -1 || currentIndex === stages.length - 1) return null
    return stages[currentIndex + 1]
  }

  const getAdvanceButtonText = (nextStage: PipelineStage): string => {
    const buttonTexts: Record<PipelineStage, string> = {
      "Screening": "Move to Screening",
      "First Meeting": "Schedule First Meeting",
      "IC1": "Submit to IC1",
      "DD": "Begin Due Diligence",
      "IC2": "Submit to IC2",
      "Closing": "Begin Closing",
      "Portfolio": "Add to Portfolio",
    }
    return buttonTexts[nextStage] || "Advance Stage"
  }

  const nextStage = startup?.pipelineStage ? getNextStage(startup.pipelineStage) : null

  const canAddTranscript = ["First Meeting", "IC1", "DD", "IC2", "Closing", "Portfolio"].includes(
    startup.pipelineStage || "",
  )
  const canAddPitchDeck = ["First Meeting", "IC1", "DD", "IC2", "Closing", "Portfolio"].includes(
    startup.pipelineStage || "",
  )
  const canAddScorecard = ["IC1", "DD", "IC2", "Closing", "Portfolio"].includes(
    startup.pipelineStage || "",
  )
  const canGenerateMemo = ["IC1", "DD", "IC2", "Closing", "Portfolio"].includes(
    startup.pipelineStage || "",
  )
  const canGenerateReport = startup.pipelineStage === "Screening"
  const canAddMeetings = ["First Meeting", "IC1", "DD", "IC2", "Closing", "Portfolio"].includes(
    startup.pipelineStage || "",
  )

  const showAdvancedTabs = ["First Meeting", "IC1", "DD", "IC2", "Closing", "Portfolio"].includes(
    startup.pipelineStage || "",
  )

  const getStageMessage = (stage: PipelineStage): string => {
    const messages: Record<PipelineStage, string> = {
      "Screening": "Initial screening - conduct outreach",
      "First Meeting": "You can now add meeting notes and documents",
      "IC1": "Prepare materials for first IC review",
      "DD": "Conduct thorough due diligence and track issues",
      "IC2": "Prepare final recommendation for IC2",
      "Closing": "Finalize term sheet and documentation",
      "Portfolio": "Active portfolio company",
    }
    return messages[stage] || ""
  }

  const handleSaveMeeting = () => {
    if (onAddThresholdMeeting && meetingForm.attendees && meetingForm.keyPoints) {
      onAddThresholdMeeting(startup.id, {
        ...meetingForm,
        date: new Date(meetingForm.date),
      })
      // Reset form
      setMeetingForm({
        date: new Date().toISOString().split("T")[0],
        meetingType: "First Meeting",
        attendees: "",
        keyPoints: "",
        decision: "More Info Needed",
        actionItems: "",
        nextSteps: "",
      })
      setShowMeetingForm(false)
    }
  }

  const handleSaveIssue = () => {
    if (onAddThresholdIssue && issueForm.issue && issueForm.mitigation) {
      onAddThresholdIssue(startup.id, issueForm)
      // Reset form
      setIssueForm({
        category: "Market Risk",
        issue: "",
        riskRating: "Medium",
        mitigation: "",
        status: "Open",
      })
      setShowIssueForm(false)
    }
  }

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case "Proceed":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
      case "Pass":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
      case "More Info Needed":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getRiskColor = (rating: string) => {
    switch (rating) {
      case "High":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
      case "Medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
      case "Low":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
      case "In Progress":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
      case "Accepted Risk":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
      case "Open":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const calculateTotalScore = () => {
    let totalWeightedScore = 0
    SCORECARD_TEMPLATE.forEach((criterion) => {
      const key = `${criterion.section}-${criterion.criterion}`
      const score = scorecardScores[key] || 0
      const weightedScore = (score / 10) * criterion.weight
      totalWeightedScore += weightedScore
    })
    return totalWeightedScore.toFixed(1)
  }

  const handleScoreChange = (section: string, criterion: string, score: number) => {
    const key = `${section}-${criterion}`
    setScorecardScores((prev) => ({
      ...prev,
      [key]: score,
    }))
  }

  const getScoreDescription = (score: number, criterion: (typeof SCORECARD_TEMPLATE)[0]) => {
    if (score >= 7) return criterion.high
    if (score >= 4) return criterion.medium
    return criterion.low
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border bg-background sticky top-0 z-10 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-6xl px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-pretty mb-3">{startup.name}</h1>
                <div className="flex gap-2 flex-wrap">
                  {startup.sector && <Badge variant="outline">{startup.sector}</Badge>}
                  {startup.country && <Badge variant="outline">{startup.country}</Badge>}
                  {startup.pipelineStage && (
                    <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                      {startup.pipelineStage}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                {startup.rank && (
                  <div className="bg-blue-100 dark:bg-blue-950 px-4 py-2 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Rank</div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">#{startup.rank}</div>
                  </div>
                )}
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="initial-assessment">Initial Assessment</TabsTrigger>
              {showAdvancedTabs && (
                <>
                  <TabsTrigger value="investment-scorecard">Investment Scorecard</TabsTrigger>
                  <TabsTrigger value="threshold-issues">Threshold Issues</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">
                      Current Stage: {startup.pipelineStage || "Screening"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getStageMessage(startup.pipelineStage || "Screening")}
                    </p>
                  </div>
                  {nextStage && onUpdateStage && (
                    <Button
                      onClick={() => onUpdateStage(startup.id, nextStage)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {getAdvanceButtonText(nextStage)}
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <p className="text-base text-muted-foreground leading-relaxed">{startup.description}</p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-foreground text-xl">AI-Generated Scores</h3>
                  {onRegenerateScores && (
                    <Button variant="outline" size="sm" onClick={() => onRegenerateScores(startup.id)}>
                      Regenerate Analysis
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  AI scores are automatically updated when you add new data (transcripts, pitch decks, scorecards).
                  Click "Regenerate Analysis" to manually refresh the scores.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-background border border-border rounded-lg p-6">
                    <div className="text-sm text-muted-foreground uppercase tracking-wide mb-2">LLM Score</div>
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                      {startup.aiScores?.llm || 0}
                    </div>
                    <Progress value={startup.aiScores?.llm || 0} className="h-2" />
                  </div>
                  <div className="bg-background border border-border rounded-lg p-6">
                    <div className="text-sm text-muted-foreground uppercase tracking-wide mb-2">ML Score</div>
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                      {startup.aiScores?.ml || 0}
                    </div>
                    <Progress value={startup.aiScores?.ml || 0} className="h-2" />
                  </div>
                </div>
              </div>

              {/* CHANGE: Added Generate Investment Memo button */}
              {canGenerateMemo && onGenerateMemo && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => onGenerateMemo(startup.id)}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold"
                  >
                    Generate Investment Memo
                  </Button>
                </div>
              )}

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Investment Analysis
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-2">Investment Score Overview</div>
                    <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {startup.investmentScoreOverview || "Not available"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-2">Key Strengths</div>
                    <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {startup.rationale?.keyStrengths || "Not available"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-2">Areas of Concern</div>
                    <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {startup.rationale?.areasOfConcern || "Not available"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-2">Market & Competition Analysis</div>
                    <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {startup.marketInfo?.marketCompetitionAnalysis || "Not available"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground mb-2">Team & Execution Assessment</div>
                    <div className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {startup.teamInfo?.teamExecutionAssessment || "Not available"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Company Information
                </h3>
                <div className="space-y-4">
                  {startup.companyInfo?.website && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Website</div>
                      <a
                        href={startup.companyInfo.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-primary hover:underline text-right"
                      >
                        {startup.companyInfo.website.replace("https://", "")}
                      </a>
                    </div>
                  )}
                  {startup.companyInfo?.linkedin && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">LinkedIn URL</div>
                      <a
                        href={startup.companyInfo.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-semibold text-primary hover:underline text-right"
                      >
                        View Profile
                      </a>
                    </div>
                  )}
                  {startup.companyInfo?.headquarters && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Location</div>
                      <div className="text-base font-semibold text-right">{startup.companyInfo.headquarters}</div>
                    </div>
                  )}
                  {startup.companyInfo?.employeeCount && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Employee Size</div>
                      <div className="text-base font-semibold text-right">{startup.companyInfo.employeeCount}</div>
                    </div>
                  )}
                  {startup.companyInfo?.area && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Area</div>
                      <div className="text-base font-semibold text-right">{startup.companyInfo.area}</div>
                    </div>
                  )}
                  {startup.companyInfo?.ventureCapitalFirm && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Venture Capital Firm</div>
                      <div className="text-base font-semibold text-right">{startup.companyInfo.ventureCapitalFirm}</div>
                    </div>
                  )}
                  {startup.companyInfo?.founded && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Founding Year</div>
                      <div className="text-base font-semibold text-right">{startup.companyInfo.founded}</div>
                    </div>
                  )}
                  {startup.companyInfo?.founders && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Founders</div>
                      <div className="text-base font-semibold text-right">{startup.companyInfo.founders}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Team Information
                </h3>
                <div className="space-y-4">
                  {startup.teamInfo?.foundersEducation && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Founders' Education</div>
                      <div className="text-base font-medium leading-relaxed">{startup.teamInfo.foundersEducation}</div>
                    </div>
                  )}
                  {startup.teamInfo?.foundersPriorExperience && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Founders' Prior Experience</div>
                      <div className="text-base font-medium leading-relaxed">
                        {startup.teamInfo.foundersPriorExperience}
                      </div>
                    </div>
                  )}
                  {startup.teamInfo?.keyTeamMembers && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Key Team Members</div>
                      <div className="text-base font-medium leading-relaxed">{startup.teamInfo.keyTeamMembers}</div>
                    </div>
                  )}
                  {startup.teamInfo?.teamDepth && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Team Depth</div>
                      <div className="text-base font-medium leading-relaxed">{startup.teamInfo.teamDepth}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Market & Industry
                </h3>
                <div className="space-y-4">
                  {startup.marketInfo?.b2bOrB2c && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">B2B or B2C</div>
                      <div className="text-base font-semibold text-right">{startup.marketInfo.b2bOrB2c}</div>
                    </div>
                  )}
                  {startup.marketInfo?.subIndustry && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Sub-Industry</div>
                      <div className="text-base font-semibold text-right">{startup.marketInfo.subIndustry}</div>
                    </div>
                  )}
                  {startup.marketInfo?.marketSize && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Market Size</div>
                      <div className="text-base font-semibold text-right">{startup.marketInfo.marketSize}</div>
                    </div>
                  )}
                  {startup.marketInfo?.aiDisruptionPropensity && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">AI Disruption Propensity</div>
                      <div className="text-base font-semibold text-right">
                        {startup.marketInfo.aiDisruptionPropensity}
                      </div>
                    </div>
                  )}
                  {startup.marketInfo?.industry && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Industry</div>
                      <div className="text-base font-semibold text-right">{startup.marketInfo.industry}</div>
                    </div>
                  )}
                  {startup.marketInfo?.targetPersona && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Target Persona</div>
                      <div className="text-base font-semibold text-right">{startup.marketInfo.targetPersona}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Sales & Go-to-Market
                </h3>
                <div className="space-y-4">
                  {startup.salesInfo?.salesMotion && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Sales Motion</div>
                      <div className="text-base font-semibold text-right">{startup.salesInfo.salesMotion}</div>
                    </div>
                  )}
                  {startup.salesInfo?.salesCycleLength && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Sales Cycle Length</div>
                      <div className="text-base font-semibold text-right">{startup.salesInfo.salesCycleLength}</div>
                    </div>
                  )}
                  {startup.salesInfo?.gtmStrategy && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Go-to-Market Strategy</div>
                      <div className="text-base font-semibold text-right">{startup.salesInfo.gtmStrategy}</div>
                    </div>
                  )}
                  {startup.salesInfo?.channels && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Channels</div>
                      <div className="text-base font-semibold text-right">{startup.salesInfo.channels}</div>
                    </div>
                  )}
                  {startup.salesInfo?.salesComplexity && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Sales Complexity</div>
                      <div className="text-base font-semibold text-right">{startup.salesInfo.salesComplexity}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Product Information
                </h3>
                <div className="space-y-4">
                  {startup.productInfo?.productName && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Product Name</div>
                      <div className="text-base font-semibold">{startup.productInfo.productName}</div>
                    </div>
                  )}
                  {startup.productInfo?.problemSolved && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Problem Solved</div>
                      <div className="text-base font-medium leading-relaxed">{startup.productInfo.problemSolved}</div>
                    </div>
                  )}
                  {startup.productInfo?.horizontalOrVertical && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Horizontal or Vertical</div>
                      <div className="text-base font-semibold text-right">
                        {startup.productInfo.horizontalOrVertical}
                      </div>
                    </div>
                  )}
                  {startup.productInfo?.moat && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Moat</div>
                      <div className="text-base font-medium leading-relaxed">{startup.productInfo.moat}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Business Model
                </h3>
                <div className="space-y-4">
                  {startup.businessModelInfo?.revenueModel && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Revenue Model</div>
                      <div className="text-base font-semibold text-right">{startup.businessModelInfo.revenueModel}</div>
                    </div>
                  )}
                  {startup.businessModelInfo?.pricingStrategy && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Pricing Strategy</div>
                      <div className="text-base font-semibold text-right">
                        {startup.businessModelInfo.pricingStrategy}
                      </div>
                    </div>
                  )}
                  {startup.businessModelInfo?.unitEconomics && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Unit Economics</div>
                      <div className="text-base font-semibold text-right">
                        {startup.businessModelInfo.unitEconomics}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Competitive Landscape
                </h3>
                <div className="space-y-4">
                  {startup.competitiveInfo?.competitors && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Competitors</div>
                      <div className="text-base font-medium leading-relaxed">{startup.competitiveInfo.competitors}</div>
                    </div>
                  )}
                  {startup.competitiveInfo?.industryMultiples && (
                    <div className="flex justify-between items-start">
                      <div className="text-sm text-muted-foreground">Industry Multiples</div>
                      <div className="text-base font-semibold text-right">
                        {startup.competitiveInfo.industryMultiples}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Risk & Opportunity
                </h3>
                <div className="space-y-4">
                  {startup.riskInfo?.regulatoryRisk && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Regulatory Risk</div>
                      <div className="text-base font-medium leading-relaxed">{startup.riskInfo.regulatoryRisk}</div>
                    </div>
                  )}
                  {startup.opportunityInfo?.exitPotential && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Exit Potential</div>
                      <div className="text-base font-medium leading-relaxed">
                        {startup.opportunityInfo.exitPotential}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="initial-assessment" className="space-y-8">
              <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                  <span className="w-1 h-6 bg-primary rounded-full"></span>
                  Initial Assessment
                </h3>
                <p className="text-muted-foreground">Initial assessment features coming soon...</p>
              </div>
            </TabsContent>

            {showAdvancedTabs && (
              <TabsContent value="investment-scorecard" className="space-y-8">
                <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                      <span className="w-1 h-6 bg-primary rounded-full"></span>
                      Investment Scorecard
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Total Score</div>
                        <div className="text-3xl font-bold text-primary">{calculateTotalScore()}</div>
                      </div>
                      {canGenerateMemo && onGenerateMemo && (
                        <Button onClick={() => onGenerateMemo(startup.id)} variant="outline" size="sm">
                          Generate Investment Memo
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-8">
                    Score each criterion from 1-10. The total score is calculated as a weighted average based on the
                    importance of each criterion.
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
                        {} as Record<string, typeof SCORECARD_TEMPLATE>,
                      ),
                    ).map(([section, criteria]) => (
                      <div key={section} className="bg-background border border-border rounded-lg p-6">
                        <h4 className="font-bold text-lg mb-6 text-primary">{section}</h4>
                        <div className="space-y-6">
                          {criteria.map((criterion) => {
                            const key = `${criterion.section}-${criterion.criterion}`
                            const score = scorecardScores[key] || 0
                            return (
                              <div key={key} className="border-b border-border pb-6 last:border-0 last:pb-0">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="font-semibold text-foreground mb-1">{criterion.criterion}</div>
                                    <div className="text-sm text-muted-foreground italic mb-3">
                                      {criterion.guidingQuestions}
                                    </div>
                                  </div>
                                  <div className="ml-4 flex items-center gap-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={score}
                                      onChange={(e) =>
                                        handleScoreChange(
                                          criterion.section,
                                          criterion.criterion,
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-20 p-2 border border-border rounded-md bg-background text-center font-semibold"
                                    />
                                    <div className="text-sm text-muted-foreground">/ 10</div>
                                    <Badge variant="outline" className="ml-2">
                                      {criterion.weight}%
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-xs">
                                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3">
                                    <div className="font-semibold text-red-700 dark:text-red-400 mb-1">Low (1-3)</div>
                                    <div className="text-muted-foreground">{criterion.low}</div>
                                  </div>
                                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                                    <div className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                                      Medium (4-6)
                                    </div>
                                    <div className="text-muted-foreground">{criterion.medium}</div>
                                  </div>
                                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-3">
                                    <div className="font-semibold text-green-700 dark:text-green-400 mb-1">
                                      High (7-10)
                                    </div>
                                    <div className="text-muted-foreground">{criterion.high}</div>
                                  </div>
                                </div>

                                {score > 0 && (
                                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                                    <div className="text-sm">
                                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                                        Current Assessment:
                                      </span>{" "}
                                      <span className="text-muted-foreground">
                                        {getScoreDescription(score, criterion)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Weighted contribution: {((score / 10) * criterion.weight).toFixed(1)} points
                                    </div>
                                  </div>
                                )}
                              </div>
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
                </div>
              </TabsContent>
            )}

            {showAdvancedTabs && (
              <TabsContent value="threshold-issues" className="space-y-8">
                <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                      <span className="w-1 h-6 bg-primary rounded-full"></span>
                      Threshold Issues
                    </h3>
                    <Button onClick={() => setShowIssueForm(true)} size="sm">
                      Add Issue
                    </Button>
                  </div>

                  {showIssueForm && (
                    <div className="bg-background border border-border rounded-lg p-4 mb-6">
                      <h4 className="font-semibold mb-4">Add New Issue</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Category</label>
                          <select
                            value={issueForm.category}
                            onChange={(e) =>
                              setIssueForm({
                                ...issueForm,
                                category: e.target.value as typeof issueForm.category,
                              })
                            }
                            className="w-full p-2 border border-border rounded-md bg-background"
                          >
                            <option value="Market Risk">Market Risk</option>
                            <option value="Team Risk">Team Risk</option>
                            <option value="Technology Risk">Technology Risk</option>
                            <option value="Legal Risk">Legal Risk</option>
                            <option value="Financial Risk">Financial Risk</option>
                            <option value="Competitive Risk">Competitive Risk</option>
                            <option value="Execution Risk">Execution Risk</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Issue Description</label>
                          <textarea
                            value={issueForm.issue}
                            onChange={(e) => setIssueForm({ ...issueForm, issue: e.target.value })}
                            className="w-full p-2 border border-border rounded-md bg-background min-h-[80px]"
                            placeholder="Describe the issue..."
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Risk Rating</label>
                          <select
                            value={issueForm.riskRating}
                            onChange={(e) =>
                              setIssueForm({
                                ...issueForm,
                                riskRating: e.target.value as typeof issueForm.riskRating,
                              })
                            }
                            className="w-full p-2 border border-border rounded-md bg-background"
                          >
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Mitigation Strategy</label>
                          <textarea
                            value={issueForm.mitigation}
                            onChange={(e) => setIssueForm({ ...issueForm, mitigation: e.target.value })}
                            className="w-full p-2 border border-border rounded-md bg-background min-h-[80px]"
                            placeholder="How can this risk be mitigated?"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveIssue} size="sm">
                            Save Issue
                          </Button>
                          <Button onClick={() => setShowIssueForm(false)} variant="outline" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {startup.thresholdIssues && startup.thresholdIssues.length > 0 ? (
                      startup.thresholdIssues.map((issue, index) => (
                        <div key={index} className="bg-background border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex gap-2">
                              <Badge variant="outline">{issue.category}</Badge>
                              <Badge className={getRiskColor(issue.riskRating)}>{issue.riskRating} Risk</Badge>
                              <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
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
                </div>
              </TabsContent>
            )}

            {showAdvancedTabs && (
              <TabsContent value="documents" className="space-y-8">
                <div className="bg-gradient-to-br from-card to-muted/20 border border-border rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-foreground mb-6 text-lg flex items-center gap-2">
                    <span className="w-1 h-6 bg-primary rounded-full"></span>
                    Documents
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Meeting Transcripts</h4>
                        {canAddTranscript && (
                          <Button onClick={() => setShowTranscriptInput(!showTranscriptInput)} size="sm">
                            {showTranscriptInput ? "Cancel" : "Add Transcript"}
                          </Button>
                        )}
                      </div>

                      {showTranscriptInput && (
                        <div className="bg-background border border-border rounded-lg p-4 mb-4">
                          <textarea
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            className="w-full p-2 border border-border rounded-md bg-background min-h-[120px]"
                            placeholder="Paste meeting transcript here..."
                          />
                          <Button onClick={handleUploadTranscript} size="sm" className="mt-2">
                            Upload Transcript
                          </Button>
                        </div>
                      )}

                      {startup.documents?.transcript ? (
                        <div className="bg-background border border-border rounded-lg p-3">
                          <div className="text-sm font-medium">Meeting Transcript</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {startup.documents.transcript.substring(0, 150)}...
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {startup.documents.transcript.length} characters
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No transcripts uploaded yet</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Pitch Deck</h4>
                        {canAddPitchDeck && (
                          <Button onClick={() => setShowPitchDeckInput(!showPitchDeckInput)} size="sm">
                            {showPitchDeckInput ? "Cancel" : "Add Pitch Deck"}
                          </Button>
                        )}
                      </div>

                      {showPitchDeckInput && (
                        <div className="bg-background border border-border rounded-lg p-4 mb-4">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handlePitchDeckFileChange}
                            className="w-full p-2 border border-border rounded-md bg-background mb-2"
                          />
                          <Button onClick={handleUploadPitchDeckFile} size="sm" disabled={!pitchDeckFile}>
                            Upload Pitch Deck
                          </Button>
                        </div>
                      )}

                      {startup.documents?.pitchDeck ? (
                        <div className="bg-background border border-border rounded-lg p-3">
                          <div className="text-sm font-medium">Pitch Deck Available</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {startup.documents.pitchDeck.length} characters extracted from PDF
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No pitch deck uploaded yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
