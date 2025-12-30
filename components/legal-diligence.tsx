"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Rocket,
  FileText,
  DollarSign,
  Users,
  Lightbulb,
  Scale,
  TrendingUp,
  Shield,
  AlertCircle,
  Target,
  Handshake,
  Building2,
  ClipboardCheck,
  Gavel,
  Send,
  Archive,
  Upload,
  Sparkles,
  Brain,
  X,
  Eye,
} from "lucide-react"
import type {
  LegalDiligenceData,
  ChecklistItem,
  ChecklistItemStatus,
  LegalIssue,
  LegalIssueSeverity,
  LegalIssueStatus,
  LegalOverallStatus,
} from "@/lib/types"

interface UploadedDocument {
  id: string
  fileName: string
  fileType: string
  uploadedAt: string
  characterCount: number
  wordCount: number
}

interface AnalysisItemResult {
  key: string
  label: string
  status: "Done" | "Issue" | "Pending" | "Not Found"
  findings: string
  concerns: string[]
  extractedData: string
}

interface AnalysisResult {
  category: string
  summary: string
  overallRisk: "Low" | "Medium" | "High" | "Critical"
  keyFindings: string[]
  redFlags: string[]
  itemAnalysis: AnalysisItemResult[]
  analyzedAt: string
  documentsAnalyzed?: string[]
  documentCount?: number
}

interface LegalDiligenceProps {
  data?: LegalDiligenceData | null
  onSave: (data: LegalDiligenceData) => Promise<void>
  startupId: string
}

const CHECKLIST_STATUSES: ChecklistItemStatus[] = [
  "Not Started", "Pending", "In Progress", "Done", "Issue", "N/A"
]

const ISSUE_SEVERITIES: LegalIssueSeverity[] = ["Critical", "High", "Medium", "Low"]
const ISSUE_STATUSES: LegalIssueStatus[] = ["Open", "Resolved", "Accepted"]
const OVERALL_STATUSES: LegalOverallStatus[] = ["Not Started", "In Progress", "Issues Found", "Clear", "Waived"]

// Comprehensive DD Checklist based on XMO Master Checklist
const DD_CHECKLIST_CATEGORIES = {
  mobilisation: {
    label: "Mobilisation",
    icon: Rocket,
    items: [
      { key: "setupDealStructures", label: "Setup deal structures - Lighthouse, Shared Folders", defaultOwner: "Deal Lead" },
      { key: "communicateTeamDetails", label: "Communicate team details to target company", defaultOwner: "Deal Lead" },
      { key: "sourceDocumentation", label: "Source available documentation - Shareholder agreement draft, term sheet etc", defaultOwner: "Deal Lead" },
      { key: "arrangeFollowUpQA", label: "Arrange follow up Q&A for IC validation", defaultOwner: "Deal Lead" },
      { key: "legalCounselOnCall", label: "Legal counsel on call / engaged", defaultOwner: "Deal Lead" },
      { key: "advisePolarCapital", label: "Advise capital partner and have them prepared", defaultOwner: "Deal Lead" },
    ],
  },
  dealTerms: {
    label: "Deal Terms",
    icon: DollarSign,
    items: [
      { key: "roundEconomics", label: "Confirm pre-money cap, round size, our cheque, dilution math, and instrument type", defaultOwner: "Deal Lead" },
      { key: "positionSizing", label: "Check position sizing vs Fund strategy: % of fund, follow-on expectations, signaling risk", defaultOwner: "Deal Lead" },
      { key: "leadInvestorAlignment", label: "Confirm lead investor terms are standard (no weird side letters / seniority)", defaultOwner: "Deal Lead" },
    ],
  },
  instrument: {
    label: "Instrument (SAFE/Convertible)",
    icon: FileText,
    items: [
      { key: "safeEconomics", label: "Review SAFE for: valuation cap, discount, MFN, pro rata rights, transferability, carve-outs", defaultOwner: "Counsel" },
      { key: "conversionTerms", label: "Confirm how/when SAFE converts into equity on next priced round", defaultOwner: "Counsel" },
      { key: "liabilityClause", label: "Include limitation of liability clause", defaultOwner: "Counsel" },
    ],
  },
  capTable: {
    label: "Cap Table & Ownership",
    icon: Users,
    items: [
      { key: "preMoneyCapTable", label: "Get current fully diluted cap table (founders, angels, notes/SAFEs)", defaultOwner: "Deal Team" },
      { key: "legacyShareholders", label: "Confirm no legacy shareholders or problematic advisory grants", defaultOwner: "Deal Team" },
      { key: "optionPool", label: "Confirm pre-money ESOP pool size and where it sits (pre or post money)", defaultOwner: "Deal Team" },
    ],
  },
  founderEquity: {
    label: "Founder Equity / Vesting",
    icon: Users,
    items: [
      { key: "founderVesting", label: "Confirm 4-year vesting with 1-year cliff (or equivalent remaining vest)", defaultOwner: "Counsel" },
      { key: "acceleratedVesting", label: "Confirm accelerated vesting is 'good leaver' only, bad leaver gets unvested stripped", defaultOwner: "Counsel" },
      { key: "founderLockIn", label: "Check that founders can't leave day 1 with significant equity", defaultOwner: "Deal Team" },
      { key: "leaverClauses", label: "Check framing of founder leaver clauses - for cause etc", defaultOwner: "Deal Team" },
    ],
  },
  ipAssignment: {
    label: "IP & Assignment",
    icon: Lightbulb,
    items: [
      { key: "ipOwnership", label: "Obtain IP assignment deeds - all code, design, brand, domains owned by company", defaultOwner: "Counsel" },
      { key: "priorEmployerIP", label: "Confirm founders not restricted by prior employers (non-compete, non-solicit, IP claims)", defaultOwner: "Deal Team" },
      { key: "founderIPWarranty", label: "Ask founders to warrant in writing that they are free and clear of IP restrictions", defaultOwner: "Deal Team" },
    ],
  },
  regulatory: {
    label: "Regulatory / Licensing",
    icon: Scale,
    items: [
      { key: "licensesNeeded", label: "High-level confirm what licenses are needed for their model", defaultOwner: "Deal Team" },
      { key: "regulatoryPlan", label: "Check they have a credible regulatory plan (not 'we'll wing it')", defaultOwner: "Deal Team" },
      { key: "complianceOwner", label: "Check there is a named person accountable for compliance, AML/CTF, credit risk", defaultOwner: "Deal Team" },
    ],
  },
  businessModel: {
    label: "Business Model & Economics",
    icon: TrendingUp,
    items: [
      { key: "unitEconomics", label: "Develop baseline model for low, base and high case on customer lifecycle assumptions", defaultOwner: "Deal Team" },
      { key: "externalFunderDependency", label: "Identify if business model hinges on external capital partners", defaultOwner: "Deal Team" },
    ],
  },
  governance: {
    label: "Governance (Future Round)",
    icon: Shield,
    items: [
      { key: "informationRights", label: "Confirm information rights - financials, board materials, material events", defaultOwner: "Counsel" },
      { key: "antiDilution", label: "Check for anti-dilution protections (weighted average vs full ratchet)", defaultOwner: "Counsel" },
      { key: "preEmptiveRights", label: "Ensure right to participate in future funding rounds pro rata", defaultOwner: "Counsel" },
      { key: "mfnClause", label: "Check if lead investor negotiated special rights - ensure MFN or comfortable without", defaultOwner: "Counsel" },
    ],
  },
  litigation: {
    label: "Litigation / Red Flags",
    icon: AlertCircle,
    items: [
      { key: "outstandingClaims", label: "Ask founders to disclose any threatened litigation, debt, employment claims, IP disputes", defaultOwner: "Deal Team" },
      { key: "personalIssues", label: "Check for personal bankruptcy issues or other red flags", defaultOwner: "Deal Team" },
    ],
  },
  useOfProceeds: {
    label: "Use of Proceeds",
    icon: Target,
    items: [
      { key: "runwayMilestones", label: "Map runway months and key 'must hit' milestones before next round", defaultOwner: "Deal Team" },
      { key: "criticalRisks", label: "Identify critical risks to address - rails, data feeds, funding facilities etc", defaultOwner: "Deal Team" },
    ],
  },
  syndicateFit: {
    label: "Investor Syndicate Fit",
    icon: Handshake,
    items: [
      { key: "strategicValue", label: "Document strategic value story - why us? Network, regulatory credibility, capital partners?", defaultOwner: "Deal Lead" },
      { key: "reputationSignalling", label: "Confirm co-investors are aligned on growth path", defaultOwner: "Deal Lead" },
    ],
  },
  preIC: {
    label: "Pre-IC Preparation",
    icon: Building2,
    items: [
      { key: "dealSummaryPack", label: "Prepare pre-IC note: problem/product/GTM/regulatory/team/terms/risks", defaultOwner: "Deal Lead" },
      { key: "conflictsCheck", label: "Confirm no internal conflicts, sector fits mandate, no LP side letter issues", defaultOwner: "Deal Lead" },
      { key: "trusteeHeadsUp", label: "Send trustee early summary: cheque size, instrument, expected timing", defaultOwner: "Ops" },
    ],
  },
  icPreliminary: {
    label: "Investment Committee (Preliminary)",
    icon: ClipboardCheck,
    items: [
      { key: "preICDiscussion", label: "Hold pre-IC session: opportunity, red flags, key dependencies. Record minutes.", defaultOwner: "IC Chair" },
      { key: "actionItems", label: "Capture outstanding asks from IC (IP evidence, vesting terms, regulatory plan)", defaultOwner: "Deal Lead" },
    ],
  },
  documentReview: {
    label: "Document Review",
    icon: FileText,
    items: [
      { key: "shareholdersAgreement", label: "Review proposed SHA for liquidation prefs, founder restrictions, drag/tag", defaultOwner: "Counsel" },
      { key: "sideLetters", label: "Capture any side letters (info rights, advisor fees, exclusivity, board rights)", defaultOwner: "Deal Lead" },
      { key: "capTablePostRound", label: "Access SAFE calculator and validate ownership table post-raise including ESOP", defaultOwner: "Deal Team" },
    ],
  },
  icFinal: {
    label: "Investment Committee (Final)",
    icon: Gavel,
    items: [
      { key: "finalICApproval", label: "Run Final IC - 'are we wiring on these terms, yes/no?' Record decision.", defaultOwner: "IC Chair" },
      { key: "conditionsPrecedent", label: "Write down CPs clearly: IP assignment, vesting schedule, regulatory roadmap", defaultOwner: "Deal Lead" },
    ],
  },
  trusteeGovernance: {
    label: "Trustee / Fund Governance",
    icon: Shield,
    items: [
      { key: "trusteeSignOff", label: "Provide trustee with: Final IC minute, investment summary, docs, pro forma cap table", defaultOwner: "Ops" },
      { key: "positionRegister", label: "Add position to fund register with instrument type, date, amount, pro rata rights", defaultOwner: "Ops" },
    ],
  },
  execution: {
    label: "Execution / Funding",
    icon: Send,
    items: [
      { key: "executeSafe", label: "Arrange signature of SAFE/subscription instrument. Ensure signatory authority correct.", defaultOwner: "Ops" },
      { key: "satisfyCPs", label: "Tick off all IC CPs and trustee CPs. Archive evidence.", defaultOwner: "Deal Lead" },
      { key: "fundsFlow", label: "Liaise for fund transfer. Capture receipt / share confirmation.", defaultOwner: "Ops" },
    ],
  },
  postClose: {
    label: "Post-Close",
    icon: Archive,
    items: [
      { key: "storeDocuments", label: "File: executed SAFE, IC minutes, trustee approval, cap table, founder bios", defaultOwner: "Ops" },
      { key: "founderEngagement", label: "Send founder engagement / onboarding materials", defaultOwner: "Deal Lead" },
    ],
  },
}

type DDChecklistKey = keyof typeof DD_CHECKLIST_CATEGORIES
type DDChecklist = Record<string, Record<string, ChecklistItem>>

function getDefaultChecklistItem(owner?: string): ChecklistItem {
  return { status: "Not Started", notes: "", owner: owner || "" }
}

function getDefaultDDChecklist(): DDChecklist {
  const checklist: DDChecklist = {}
  Object.entries(DD_CHECKLIST_CATEGORIES).forEach(([categoryKey, category]) => {
    checklist[categoryKey] = {}
    category.items.forEach((item) => {
      checklist[categoryKey][item.key] = getDefaultChecklistItem(item.defaultOwner)
    })
  })
  return checklist
}

function getDefaultData(): LegalDiligenceData {
  return {
    checklist: getDefaultDDChecklist() as any,
    issues: [],
    overallStatus: "Not Started",
    counselName: "",
    counselNotes: "",
    lastUpdated: new Date().toISOString(),
  }
}

function getStatusColor(status: ChecklistItemStatus): string {
  switch (status) {
    case "Done": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    case "In Progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case "Pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    case "Issue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    case "N/A": return "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
  }
}

function getOverallStatusColor(status: LegalOverallStatus): string {
  switch (status) {
    case "Clear": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    case "In Progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    case "Issues Found": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    case "Waived": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
  }
}

function getSeverityColor(severity: LegalIssueSeverity): string {
  switch (severity) {
    case "Critical": return "bg-red-600 text-white"
    case "High": return "bg-orange-500 text-white"
    case "Medium": return "bg-yellow-500 text-white"
    case "Low": return "bg-blue-500 text-white"
  }
}

function getSeverityIcon(severity: LegalIssueSeverity) {
  switch (severity) {
    case "Critical": return <XCircle className="h-4 w-4" />
    case "High": return <AlertTriangle className="h-4 w-4" />
    case "Medium": return <Clock className="h-4 w-4" />
    case "Low": return <CheckCircle2 className="h-4 w-4" />
  }
}

export function LegalDiligenceComponent({ data, onSave, startupId }: LegalDiligenceProps) {
  const [formData, setFormData] = useState<LegalDiligenceData>(data || getDefaultData())
  const [isSaving, setIsSaving] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const sections: Record<string, boolean> = { issues: true }
    Object.keys(DD_CHECKLIST_CATEGORIES).forEach((key) => {
      sections[key] = false // Start collapsed
    })
    sections.mobilisation = true // Open first section
    return sections
  })

  // Document upload and analysis state (now stores arrays of documents per category)
  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, UploadedDocument[]>>({})
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({})
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [analyzingCategory, setAnalyzingCategory] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState<Record<string, boolean>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (data) {
      // Merge with defaults to handle missing fields
      const defaultChecklist = getDefaultDDChecklist()
      const mergedChecklist: DDChecklist = {}

      Object.keys(DD_CHECKLIST_CATEGORIES).forEach((categoryKey) => {
        mergedChecklist[categoryKey] = {
          ...defaultChecklist[categoryKey],
          ...((data.checklist as any)?.[categoryKey] || {}),
        }
      })

      setFormData({
        ...getDefaultData(),
        ...data,
        checklist: mergedChecklist as any,
      })

      // Load uploaded documents and analysis results
      const anyData = data as any
      if (anyData.uploadedDocuments) {
        // Normalize to array format (handle legacy single document format)
        const normalized: Record<string, UploadedDocument[]> = {}
        for (const [cat, docs] of Object.entries(anyData.uploadedDocuments)) {
          if (Array.isArray(docs)) {
            normalized[cat] = docs as UploadedDocument[]
          } else if (docs && typeof docs === 'object') {
            // Legacy single document - convert to array
            normalized[cat] = [docs as UploadedDocument]
          }
        }
        setUploadedDocuments(normalized)
      }
      if (anyData.analysisResults) {
        setAnalysisResults(anyData.analysisResults)
      }
    }
  }, [data])

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave({
        ...formData,
        lastUpdated: new Date().toISOString(),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateChecklistItem = (
    category: string,
    itemKey: string,
    field: keyof ChecklistItem,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      checklist: {
        ...(prev.checklist as any),
        [category]: {
          ...((prev.checklist as any)[category] || {}),
          [itemKey]: {
            ...(((prev.checklist as any)[category] || {})[itemKey] || getDefaultChecklistItem()),
            [field]: value,
          },
        },
      },
    }))
  }

  const addIssue = () => {
    const newIssue: LegalIssue = {
      id: `issue-${Date.now()}`,
      category: "",
      issue: "",
      severity: "Medium",
      status: "Open",
      notes: "",
      identifiedDate: new Date().toISOString().split("T")[0],
    }
    setFormData((prev) => ({
      ...prev,
      issues: [...prev.issues, newIssue],
    }))
  }

  const removeIssue = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      issues: prev.issues.filter((issue) => issue.id !== id),
    }))
  }

  const updateIssue = (id: string, field: keyof LegalIssue, value: string) => {
    setFormData((prev) => ({
      ...prev,
      issues: prev.issues.map((issue) =>
        issue.id === id ? { ...issue, [field]: value } : issue
      ),
    }))
  }

  // File upload handler - appends to existing documents
  const handleFileUpload = async (category: string, file: File) => {
    setUploadingCategory(category)
    try {
      const formData = new FormData()
      formData.append("startupId", startupId)
      formData.append("category", category)
      formData.append("file", file)

      const response = await fetch("/api/legal-dd/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const result = await response.json()

      // Update local state - append new document to array
      const newDoc: UploadedDocument = {
        id: result.document.id,
        fileName: result.document.fileName,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        characterCount: result.document.characterCount,
        wordCount: result.document.wordCount,
      }

      setUploadedDocuments((prev) => ({
        ...prev,
        [category]: [...(prev[category] || []), newDoc],
      }))

      // Clear any previous analysis for this category (since docs changed)
      setAnalysisResults((prev) => {
        const updated = { ...prev }
        delete updated[category]
        return updated
      })
    } catch (error) {
      console.error("Upload error:", error)
      alert(error instanceof Error ? error.message : "Failed to upload document")
    } finally {
      setUploadingCategory(null)
    }
  }

  // Delete uploaded document (by ID or all in category)
  const handleDeleteDocument = async (category: string, documentId?: string) => {
    try {
      const url = documentId
        ? `/api/legal-dd/upload?startupId=${startupId}&category=${category}&documentId=${documentId}`
        : `/api/legal-dd/upload?startupId=${startupId}&category=${category}`

      const response = await fetch(url, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete document")
      }

      if (documentId) {
        // Remove specific document from array
        setUploadedDocuments((prev) => {
          const categoryDocs = prev[category] || []
          const filtered = categoryDocs.filter(doc => doc.id !== documentId)
          if (filtered.length === 0) {
            const updated = { ...prev }
            delete updated[category]
            return updated
          }
          return { ...prev, [category]: filtered }
        })
      } else {
        // Remove all documents in category
        setUploadedDocuments((prev) => {
          const updated = { ...prev }
          delete updated[category]
          return updated
        })
      }

      // Clear analysis results since docs changed
      setAnalysisResults((prev) => {
        const updated = { ...prev }
        delete updated[category]
        return updated
      })
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete document")
    }
  }

  // AI Analysis handler
  const handleAnalyzeDocument = async (category: string) => {
    setAnalyzingCategory(category)
    try {
      const response = await fetch("/api/legal-dd/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId, category }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Analysis failed")
      }

      const result = await response.json()

      setAnalysisResults((prev) => ({
        ...prev,
        [category]: result.analysis,
      }))

      // Auto-show the analysis
      setShowAnalysis((prev) => ({ ...prev, [category]: true }))
    } catch (error) {
      console.error("Analysis error:", error)
      alert(error instanceof Error ? error.message : "Failed to analyze document")
    } finally {
      setAnalyzingCategory(null)
    }
  }

  // Apply analysis results to checklist
  const applyAnalysisToChecklist = (category: string) => {
    const analysis = analysisResults[category]
    if (!analysis) return

    analysis.itemAnalysis.forEach((item) => {
      const statusMap: Record<string, ChecklistItemStatus> = {
        "Done": "Done",
        "Issue": "Issue",
        "Pending": "Pending",
        "Not Found": "Not Started",
      }

      const findings = [
        item.findings,
        item.extractedData ? `Data: ${item.extractedData}` : "",
        item.concerns.length > 0 ? `Concerns: ${item.concerns.join("; ")}` : "",
      ].filter(Boolean).join(" | ")

      updateChecklistItem(category, item.key, "status", statusMap[item.status] || "Not Started")
      updateChecklistItem(category, item.key, "notes", findings)
    })

    // Add red flags as issues
    if (analysis.redFlags && analysis.redFlags.length > 0) {
      analysis.redFlags.forEach((flag) => {
        const newIssue: LegalIssue = {
          id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category: category,
          issue: flag,
          severity: "High",
          status: "Open",
          notes: `Auto-detected from AI analysis of ${analysis.documentFileName || "document"}`,
          identifiedDate: new Date().toISOString().split("T")[0],
        }
        setFormData((prev) => ({
          ...prev,
          issues: [...prev.issues, newIssue],
        }))
      })
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Critical": return "bg-red-600 text-white"
      case "High": return "bg-orange-500 text-white"
      case "Medium": return "bg-yellow-500 text-white"
      case "Low": return "bg-green-500 text-white"
      default: return "bg-gray-500 text-white"
    }
  }

  // Calculate progress
  const calculateProgress = () => {
    let total = 0
    let completed = 0

    Object.entries(DD_CHECKLIST_CATEGORIES).forEach(([categoryKey, category]) => {
      category.items.forEach((item) => {
        total++
        const itemData = ((formData.checklist as any)?.[categoryKey]?.[item.key] as ChecklistItem)
        if (itemData?.status === "Done" || itemData?.status === "N/A") {
          completed++
        }
      })
    })

    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

  const calculateCategoryProgress = (categoryKey: string) => {
    const category = DD_CHECKLIST_CATEGORIES[categoryKey as DDChecklistKey]
    if (!category) return { completed: 0, total: 0 }

    let total = category.items.length
    let completed = 0

    category.items.forEach((item) => {
      const itemData = ((formData.checklist as any)?.[categoryKey]?.[item.key] as ChecklistItem)
      if (itemData?.status === "Done" || itemData?.status === "N/A") {
        completed++
      }
    })

    return { completed, total }
  }

  const progress = calculateProgress()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Due Diligence Checklist</h2>
          <p className="text-muted-foreground">
            Comprehensive investment due diligence tracker
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge className={getOverallStatusColor(formData.overallStatus)}>
            {formData.overallStatus}
          </Badge>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Progress & Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <Label>Overall Status</Label>
              <Select
                value={formData.overallStatus}
                onValueChange={(value: LegalOverallStatus) =>
                  setFormData((prev) => ({ ...prev, overallStatus: value }))
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OVERALL_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Legal Counsel</Label>
              <Input
                placeholder="Counsel name / firm"
                value={formData.counselName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, counselName: e.target.value }))
                }
                className="w-[250px]"
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Checklist Progress</p>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="w-32 h-2" />
              <span className="text-sm font-medium">{progress}%</span>
            </div>
          </div>
        </div>
        <div>
          <Label>General Notes</Label>
          <Textarea
            placeholder="General notes from due diligence review..."
            value={formData.counselNotes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, counselNotes: e.target.value }))
            }
            rows={2}
          />
        </div>
      </Card>

      {/* Checklist Sections */}
      {Object.entries(DD_CHECKLIST_CATEGORIES).map(([categoryKey, category]) => {
        const IconComponent = category.icon
        const { completed, total } = calculateCategoryProgress(categoryKey)

        return (
          <Card key={categoryKey} className="p-6">
            <Collapsible
              open={openSections[categoryKey]}
              onOpenChange={() => toggleSection(categoryKey)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">{category.label}</h3>
                  <Badge variant="outline" className="ml-2">
                    {completed}/{total}
                  </Badge>
                </div>
                {openSections[categoryKey] ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                {/* Document Upload & AI Analysis Section */}
                <div className="mb-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">AI Document Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={(el) => { fileInputRefs.current[categoryKey] = el }}
                        className="hidden"
                        accept=".pdf,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(categoryKey, file)
                          e.target.value = ""
                        }}
                      />

                      {/* Upload button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[categoryKey]?.click()}
                        disabled={uploadingCategory === categoryKey}
                      >
                        {uploadingCategory === categoryKey ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload PDF
                      </Button>

                      {/* Analyze button - only show if documents uploaded */}
                      {uploadedDocuments[categoryKey] && uploadedDocuments[categoryKey].length > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleAnalyzeDocument(categoryKey)}
                          disabled={analyzingCategory === categoryKey}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {analyzingCategory === categoryKey ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-1" />
                              Analyze {uploadedDocuments[categoryKey].length} Doc{uploadedDocuments[categoryKey].length > 1 ? 's' : ''}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Uploaded documents list */}
                  {uploadedDocuments[categoryKey] && uploadedDocuments[categoryKey].length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          {uploadedDocuments[categoryKey].length} document{uploadedDocuments[categoryKey].length > 1 ? 's' : ''} uploaded
                        </span>
                        {uploadedDocuments[categoryKey].length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(categoryKey)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remove All
                          </Button>
                        )}
                      </div>
                      {uploadedDocuments[categoryKey].map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded border">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">{doc.fileName}</span>
                            <span className="text-xs text-muted-foreground">
                              ({doc.wordCount?.toLocaleString() || 0} words)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(categoryKey, doc.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Analysis Results */}
                  {analysisResults[categoryKey] && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskColor(analysisResults[categoryKey].overallRisk)}>
                            {analysisResults[categoryKey].overallRisk} Risk
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {analysisResults[categoryKey].documentCount || analysisResults[categoryKey].documentsAnalyzed?.length || 1} doc{(analysisResults[categoryKey].documentCount || 1) > 1 ? 's' : ''} analyzed {new Date(analysisResults[categoryKey].analyzedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAnalysis((prev) => ({ ...prev, [categoryKey]: !prev[categoryKey] }))}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {showAnalysis[categoryKey] ? "Hide" : "Show"} Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => applyAnalysisToChecklist(categoryKey)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Apply to Checklist
                          </Button>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-sm text-muted-foreground mb-2">{analysisResults[categoryKey].summary}</p>

                      {/* Expanded Analysis */}
                      {showAnalysis[categoryKey] && (
                        <div className="space-y-3 mt-3">
                          {/* Key Findings */}
                          {analysisResults[categoryKey].keyFindings.length > 0 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded">
                              <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                Key Findings
                              </h5>
                              <ul className="text-sm space-y-1">
                                {analysisResults[categoryKey].keyFindings.map((finding, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    {finding}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Red Flags */}
                          {analysisResults[categoryKey].redFlags.length > 0 && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded">
                              <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                Red Flags
                              </h5>
                              <ul className="text-sm space-y-1">
                                {analysisResults[categoryKey].redFlags.map((flag, i) => (
                                  <li key={i} className="flex items-start gap-2 text-red-700 dark:text-red-400">
                                    <span>⚠️</span>
                                    {flag}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Item Analysis */}
                          <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded">
                            <h5 className="font-medium text-sm mb-2">Item Analysis</h5>
                            <div className="space-y-2">
                              {analysisResults[categoryKey].itemAnalysis.map((item) => (
                                <div key={item.key} className="text-sm p-2 bg-white dark:bg-background rounded border">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium">{item.label}</span>
                                    <Badge className={`text-xs ${
                                      item.status === "Done" ? "bg-green-100 text-green-800" :
                                      item.status === "Issue" ? "bg-red-100 text-red-800" :
                                      item.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                                      "bg-gray-100 text-gray-600"
                                    }`}>
                                      {item.status}
                                    </Badge>
                                  </div>
                                  <p className="text-muted-foreground">{item.findings}</p>
                                  {item.extractedData && (
                                    <p className="text-xs mt-1 text-blue-600">Data: {item.extractedData}</p>
                                  )}
                                  {item.concerns.length > 0 && (
                                    <p className="text-xs mt-1 text-red-600">Concerns: {item.concerns.join(", ")}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty state */}
                  {(!uploadedDocuments[categoryKey] || uploadedDocuments[categoryKey].length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      Upload PDF documents to analyze them against this category&apos;s checklist items. You can upload multiple documents.
                    </p>
                  )}
                </div>

                {/* Checklist Items */}
                <div className="space-y-3">
                  {category.items.map((item) => {
                    const itemData = ((formData.checklist as any)?.[categoryKey]?.[item.key] as ChecklistItem) || getDefaultChecklistItem(item.defaultOwner)

                    return (
                      <div
                        key={item.key}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-[280px]">
                          <p className="font-medium text-sm">{item.label}</p>
                        </div>
                        <div className="w-[120px]">
                          <Select
                            value={itemData.status}
                            onValueChange={(value: ChecklistItemStatus) =>
                              updateChecklistItem(categoryKey, item.key, "status", value)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHECKLIST_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  <Badge className={`${getStatusColor(status)} text-xs`}>
                                    {status}
                                  </Badge>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-[100px]">
                          <Input
                            placeholder="Owner"
                            value={itemData.owner || ""}
                            onChange={(e) =>
                              updateChecklistItem(categoryKey, item.key, "owner", e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Notes..."
                            value={itemData.notes}
                            onChange={(e) =>
                              updateChecklistItem(categoryKey, item.key, "notes", e.target.value)
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}

      {/* Issues Section */}
      <Card className="p-6">
        <Collapsible
          open={openSections.issues}
          onOpenChange={() => toggleSection("issues")}
        >
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold">Issues & Flags</h3>
              {formData.issues.filter((i) => i.status === "Open").length > 0 && (
                <Badge variant="destructive">
                  {formData.issues.filter((i) => i.status === "Open").length} Open
                </Badge>
              )}
            </div>
            {openSections.issues ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={addIssue}>
                <Plus className="h-4 w-4 mr-1" /> Add Issue
              </Button>
            </div>

            {formData.issues.length > 0 ? (
              <div className="space-y-3">
                {formData.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 border rounded-lg bg-muted/30 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Input
                            placeholder="e.g., IP, Regulatory"
                            value={issue.category}
                            onChange={(e) =>
                              updateIssue(issue.id, "category", e.target.value)
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Severity</Label>
                          <Select
                            value={issue.severity}
                            onValueChange={(value: LegalIssueSeverity) =>
                              updateIssue(issue.id, "severity", value)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE_SEVERITIES.map((sev) => (
                                <SelectItem key={sev} value={sev}>
                                  <div className="flex items-center gap-1">
                                    {getSeverityIcon(sev)}
                                    {sev}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select
                            value={issue.status}
                            onValueChange={(value: LegalIssueStatus) =>
                              updateIssue(issue.id, "status", value)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ISSUE_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Identified Date</Label>
                          <Input
                            type="date"
                            value={issue.identifiedDate}
                            onChange={(e) =>
                              updateIssue(issue.id, "identifiedDate", e.target.value)
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeIssue(issue.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div>
                      <Label className="text-xs">Issue Description</Label>
                      <Textarea
                        placeholder="Describe the issue..."
                        value={issue.issue}
                        onChange={(e) =>
                          updateIssue(issue.id, "issue", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Notes / Resolution</Label>
                      <Textarea
                        placeholder="Notes on resolution, mitigation, or follow-up..."
                        value={issue.notes}
                        onChange={(e) =>
                          updateIssue(issue.id, "notes", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No issues identified yet. Click &quot;Add Issue&quot; to log a flag.
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Last Updated */}
      {formData.lastUpdated && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(formData.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  )
}
