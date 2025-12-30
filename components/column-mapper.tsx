"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Package,
  PieChart,
  Target,
  AlertTriangle,
  BarChart2,
  Brain,
  FileQuestion,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type {
  ColumnMapping,
  CSVPreview,
  LLMAnalyzeResponse,
  LLMMappingSuggestion,
  PREDEFINED_CATEGORIES,
  EditableMappingState,
} from "@/lib/types"

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  companyInfo: <Building2 className="h-4 w-4" />,
  teamInfo: <Users className="h-4 w-4" />,
  marketInfo: <TrendingUp className="h-4 w-4" />,
  salesInfo: <DollarSign className="h-4 w-4" />,
  productInfo: <Package className="h-4 w-4" />,
  businessModel: <PieChart className="h-4 w-4" />,
  competitiveInfo: <Target className="h-4 w-4" />,
  riskOpportunity: <AlertTriangle className="h-4 w-4" />,
  metrics: <BarChart2 className="h-4 w-4" />,
  aiScores: <Brain className="h-4 w-4" />,
  core: <FileQuestion className="h-4 w-4" />,
  unmapped: <FileQuestion className="h-4 w-4" />,
}

// Category display names
const CATEGORY_NAMES: Record<string, string> = {
  companyInfo: "Company Info",
  teamInfo: "Team Info",
  marketInfo: "Market Info",
  salesInfo: "Sales Info",
  productInfo: "Product Info",
  businessModel: "Business Model",
  competitiveInfo: "Competitive Info",
  riskOpportunity: "Risk & Opportunity",
  metrics: "Metrics",
  aiScores: "AI Scores",
  core: "Core Fields",
  unmapped: "Unmapped",
}

interface ColumnMapperProps {
  preview: CSVPreview
  suggestedMapping: ColumnMapping
  onConfirm: (mapping: ColumnMapping, aiMappings?: LLMMappingSuggestion[]) => void
  onCancel: () => void
}

export function ColumnMapper({ preview, suggestedMapping, onConfirm, onCancel }: ColumnMapperProps) {
  // State for AI analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<LLMAnalyzeResponse | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [showFeedback, setShowFeedback] = useState(false)

  // State for mapping
  const [mapping, setMapping] = useState<ColumnMapping>(suggestedMapping)
  const [editableMappings, setEditableMappings] = useState<EditableMappingState[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["core", "unmapped"]))

  // View mode
  const [viewMode, setViewMode] = useState<"ai" | "manual">("ai")

  // Analyze CSV with AI
  const analyzeWithAI = useCallback(async (userFeedback?: string) => {
    setIsAnalyzing(true)
    setAiError(null)

    try {
      const response = await fetch("/api/csv-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: preview.headers,
          sampleRows: preview.sampleRows,
          existingCategories: Object.keys(CATEGORY_NAMES),
          userContext: userFeedback,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Analysis failed")
      }

      const data: LLMAnalyzeResponse = await response.json()
      setAiSuggestions(data)

      // Convert AI suggestions to editable mappings
      const newEditableMappings: EditableMappingState[] = preview.headers.map((header) => {
        const suggestion = data.mappings.find((m) => m.csvHeader === header)
        if (suggestion) {
          return {
            csvHeader: header,
            category: suggestion.suggestedCategory,
            field: suggestion.suggestedField,
            isNewCategory: suggestion.categoryType === "new",
            isNewField: false,
            dataType: "text",
            skip: false,
            llmSuggestion: suggestion,
          }
        }
        return {
          csvHeader: header,
          category: "unmapped",
          field: "",
          isNewCategory: false,
          isNewField: false,
          dataType: "text",
          skip: false,
        }
      })
      setEditableMappings(newEditableMappings)

      // Update traditional mapping from AI suggestions
      updateMappingFromAI(data)

    } catch (error) {
      console.error("[Column Mapper] AI analysis error:", error)
      setAiError(error instanceof Error ? error.message : "Analysis failed")
    } finally {
      setIsAnalyzing(false)
    }
  }, [preview.headers, preview.sampleRows])

  // Run AI analysis on mount and when preview data changes
  useEffect(() => {
    analyzeWithAI()
  }, [analyzeWithAI])

  // Update traditional mapping from AI suggestions
  const updateMappingFromAI = (data: LLMAnalyzeResponse) => {
    const newMapping: ColumnMapping = { ...suggestedMapping }

    data.mappings.forEach((suggestion) => {
      const fieldMap: Record<string, keyof ColumnMapping> = {
        "core.name": "name",
        "core.description": "description",
        "core.sector": "sector",
        "core.country": "country",
        "companyInfo.website": "website",
        "companyInfo.linkedin": "linkedinUrl",
        "companyInfo.location": "location",
        "companyInfo.headquarters": "headquarters",
        "companyInfo.founded": "foundingYear",
        "companyInfo.founders": "founders",
        "companyInfo.employeeCount": "employeeCount",
        "companyInfo.fundingRaised": "fundingRaised",
        "teamInfo.foundersEducation": "foundersEducation",
        "teamInfo.foundersPriorExperience": "foundersPriorExperience",
        "teamInfo.keyTeamMembers": "keyTeamMembers",
        "teamInfo.teamDepth": "teamDepth",
        "marketInfo.industry": "industry",
        "marketInfo.subIndustry": "subIndustry",
        "marketInfo.marketSize": "marketSize",
        "marketInfo.b2bOrB2c": "b2bOrB2c",
        "salesInfo.salesMotion": "salesMotion",
        "salesInfo.gtmStrategy": "gtmStrategy",
        "productInfo.problemSolved": "problemSolved",
        "productInfo.moat": "moat",
        "businessModel.revenueModel": "revenueModel",
        "competitiveInfo.competitors": "competitors",
        "aiScores.score": "score",
      }

      const mappingKey = `${suggestion.suggestedCategory}.${suggestion.suggestedField}`
      const field = fieldMap[mappingKey]
      if (field) {
        newMapping[field] = suggestion.csvHeader
      }
    })

    setMapping(newMapping)
  }

  // Handle re-analyze with feedback
  const handleReanalyze = () => {
    if (feedbackText.trim()) {
      analyzeWithAI(feedbackText)
      setFeedbackText("")
      setShowFeedback(false)
    }
  }

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  // Update mapping for a specific header
  const updateEditableMapping = (csvHeader: string, updates: Partial<EditableMappingState>) => {
    setEditableMappings((prev) =>
      prev.map((m) => (m.csvHeader === csvHeader ? { ...m, ...updates } : m))
    )
  }

  // Skip/unskip a column
  const toggleSkip = (csvHeader: string) => {
    updateEditableMapping(csvHeader, {
      skip: !editableMappings.find((m) => m.csvHeader === csvHeader)?.skip,
    })
  }

  // Legacy manual mapping update
  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value === "none" ? undefined : value }))
  }

  // Confirm and import
  const handleConfirm = () => {
    console.log("[Column Mapper] Confirming mapping:", mapping)
    // Pass AI suggestions along with the mapping so unmapped fields can be stored in customData
    const aiMappings = aiSuggestions?.mappings.filter(m =>
      !editableMappings.find(em => em.csvHeader === m.csvHeader && em.skip)
    )
    console.log("[Column Mapper] AI mappings for custom data:", aiMappings?.length || 0)
    onConfirm(mapping, aiMappings)
  }

  // Group mappings by category
  const mappingsByCategory = editableMappings.reduce((acc, mapping) => {
    const category = mapping.category || "unmapped"
    if (!acc[category]) acc[category] = []
    acc[category].push(mapping)
    return acc
  }, {} as Record<string, EditableMappingState[]>)

  // Check if minimum required fields are mapped
  const isValid = mapping.name !== undefined

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-500"
    if (confidence >= 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Get confidence badge variant
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return "default"
    if (confidence >= 60) return "secondary"
    return "destructive"
  }

  // Render AI-powered view
  const renderAIView = () => (
    <div className="space-y-4">
      {/* AI Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm text-muted-foreground">Analyzing columns with AI...</span>
            </>
          ) : aiSuggestions ? (
            <>
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">
                AI organized {aiSuggestions.mappings.length} columns into{" "}
                {Object.keys(mappingsByCategory).length} categories
              </span>
              <Badge variant={getConfidenceBadge(aiSuggestions.confidence)}>
                {aiSuggestions.confidence}% confidence
              </Badge>
            </>
          ) : aiError ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500">{aiError}</span>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {!isAnalyzing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFeedback(!showFeedback)}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Re-analyze with AI
            </Button>
          )}
        </div>
      </div>

      {/* Feedback input for re-analysis */}
      {showFeedback && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <Label>Give AI guidance to improve suggestions</Label>
          <Textarea
            placeholder="E.g., 'The Revenue column should go under Metrics, not Business Model' or 'Group all social media URLs together'"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleReanalyze} disabled={!feedbackText.trim()}>
              <Sparkles className="h-4 w-4 mr-1" />
              Re-analyze
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowFeedback(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Analysis notes */}
      {aiSuggestions?.analysisNotes && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>{aiSuggestions.analysisNotes}</AlertDescription>
        </Alert>
      )}

      {/* Categories with mappings */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {Object.entries(mappingsByCategory)
          .sort(([a], [b]) => {
            // Put core and unmapped at top
            if (a === "core") return -1
            if (b === "core") return 1
            if (a === "unmapped") return -1
            if (b === "unmapped") return 1
            return 0
          })
          .map(([category, mappings]) => (
            <Collapsible
              key={category}
              open={expandedCategories.has(category)}
              onOpenChange={() => toggleCategory(category)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    {expandedCategories.has(category) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    {CATEGORY_ICONS[category] || <FileQuestion className="h-4 w-4" />}
                    <span className="font-medium">
                      {CATEGORY_NAMES[category] || category}
                    </span>
                    <Badge variant="outline">{mappings.length}</Badge>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2 pl-4">
                  {mappings.map((m) => (
                    <div
                      key={m.csvHeader}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        m.skip ? "bg-muted/30 opacity-60" : "bg-card"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {/* Confidence indicator */}
                        {m.llmSuggestion && (
                          <div
                            className={`w-2 h-8 rounded-full ${getConfidenceColor(
                              m.llmSuggestion.confidence
                            )}`}
                            title={`${m.llmSuggestion.confidence}% confidence`}
                          />
                        )}

                        {/* CSV Header */}
                        <div className="min-w-[150px]">
                          <div className="font-medium text-sm">{m.csvHeader}</div>
                          {m.llmSuggestion?.sampleValue && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {m.llmSuggestion.sampleValue}
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />

                        {/* Mapped field */}
                        <div>
                          <div className="text-sm">
                            {m.field || <span className="text-muted-foreground">Not mapped</span>}
                          </div>
                          {m.llmSuggestion?.reasoning && (
                            <div className="text-xs text-muted-foreground">
                              {m.llmSuggestion.reasoning}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Skip toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSkip(m.csvHeader)}
                        title={m.skip ? "Include this column" : "Skip this column"}
                      >
                        {m.skip ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
      </div>
    </div>
  )

  // Legacy manual mapping field component
  const MappingField = ({
    id,
    label,
    required = false,
    value,
    onChange,
  }: {
    id: string
    label: string
    required?: boolean
    value?: string
    onChange: (value: string) => void
  }) => (
    <div className="grid gap-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        {label} {required && <span className="text-destructive">*</span>}
        {value && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      </Label>
      <Select value={value || "none"} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select column..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- Not mapped --</SelectItem>
          {preview.headers.map((header) => (
            <SelectItem key={header} value={header}>
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  // Render manual mapping view (legacy)
  const renderManualView = () => (
    <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
      {/* Required Fields */}
      <div className="space-y-4">
        <div className="mb-2">
          <h4 className="text-sm font-semibold text-foreground">Required Fields</h4>
          <p className="text-xs text-muted-foreground">
            Company Name is required to import
          </p>
        </div>

        <MappingField
          id="name-mapping"
          label="Company Name"
          required
          value={mapping.name}
          onChange={(v) => updateMapping("name", v)}
        />
        <MappingField
          id="sector-mapping"
          label="Sector"
          value={mapping.sector}
          onChange={(v) => updateMapping("sector", v)}
        />
        <MappingField
          id="description-mapping"
          label="Description"
          value={mapping.description}
          onChange={(v) => updateMapping("description", v)}
        />
      </div>

      <Separator />

      {/* Company Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Company Info</h4>
        <MappingField
          id="country-mapping"
          label="Country"
          value={mapping.country}
          onChange={(v) => updateMapping("country", v)}
        />
        <MappingField
          id="website-mapping"
          label="Website"
          value={mapping.website}
          onChange={(v) => updateMapping("website", v)}
        />
        <MappingField
          id="linkedin-mapping"
          label="LinkedIn URL"
          value={mapping.linkedinUrl}
          onChange={(v) => updateMapping("linkedinUrl", v)}
        />
        <MappingField
          id="founded-mapping"
          label="Founding Year"
          value={mapping.foundingYear}
          onChange={(v) => updateMapping("foundingYear", v)}
        />
        <MappingField
          id="employeeCount-mapping"
          label="Employee Count"
          value={mapping.employeeCount}
          onChange={(v) => updateMapping("employeeCount", v)}
        />
        <MappingField
          id="fundingRaised-mapping"
          label="Funding Raised"
          value={mapping.fundingRaised}
          onChange={(v) => updateMapping("fundingRaised", v)}
        />
      </div>

      <Separator />

      {/* Team Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Team Info</h4>
        <MappingField
          id="founders-mapping"
          label="Founders"
          value={mapping.founders}
          onChange={(v) => updateMapping("founders", v)}
        />
        <MappingField
          id="foundersEducation-mapping"
          label="Founders Education"
          value={mapping.foundersEducation}
          onChange={(v) => updateMapping("foundersEducation", v)}
        />
        <MappingField
          id="foundersPriorExperience-mapping"
          label="Prior Experience"
          value={mapping.foundersPriorExperience}
          onChange={(v) => updateMapping("foundersPriorExperience", v)}
        />
      </div>

      <Separator />

      {/* Market Info */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Market Info</h4>
        <MappingField
          id="industry-mapping"
          label="Industry"
          value={mapping.industry}
          onChange={(v) => updateMapping("industry", v)}
        />
        <MappingField
          id="marketSize-mapping"
          label="Market Size"
          value={mapping.marketSize}
          onChange={(v) => updateMapping("marketSize", v)}
        />
        <MappingField
          id="b2bOrB2c-mapping"
          label="B2B or B2C"
          value={mapping.b2bOrB2c}
          onChange={(v) => updateMapping("b2bOrB2c", v)}
        />
      </div>

      <Separator />

      {/* Product & Business */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">Product & Business</h4>
        <MappingField
          id="problemSolved-mapping"
          label="Problem Solved"
          value={mapping.problemSolved}
          onChange={(v) => updateMapping("problemSolved", v)}
        />
        <MappingField
          id="moat-mapping"
          label="Competitive Moat"
          value={mapping.moat}
          onChange={(v) => updateMapping("moat", v)}
        />
        <MappingField
          id="revenueModel-mapping"
          label="Revenue Model"
          value={mapping.revenueModel}
          onChange={(v) => updateMapping("revenueModel", v)}
        />
      </div>

      <Separator />

      {/* AI Scores */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">AI Scores</h4>
        <MappingField
          id="score-mapping"
          label="LLM Score"
          value={mapping.score}
          onChange={(v) => updateMapping("score", v)}
        />
        <MappingField
          id="mlScore-mapping"
          label="ML Score"
          value={mapping.machineLearningScore}
          onChange={(v) => updateMapping("machineLearningScore", v)}
        />
      </div>
    </div>
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Map CSV Columns
        </CardTitle>
        <CardDescription>
          AI has analyzed {preview.rowCount} rows and suggested intelligent mappings.
          Review and adjust as needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  {preview.headers.slice(0, 6).map((header, i) => (
                    <th key={i} className="px-4 py-2 text-left font-medium">
                      {header}
                    </th>
                  ))}
                  {preview.headers.length > 6 && (
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      +{preview.headers.length - 6} more
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.sampleRows.slice(0, 2).map((row, i) => (
                  <tr key={i} className="border-t">
                    {row.slice(0, 6).map((cell, j) => (
                      <td key={j} className="px-4 py-2 text-muted-foreground">
                        {cell.length > 30 ? `${cell.substring(0, 30)}...` : cell}
                      </td>
                    ))}
                    {row.length > 6 && <td className="px-4 py-2">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* View mode tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "ai" | "manual")}>
          <TabsList>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Suggestions
            </TabsTrigger>
            <TabsTrigger value="manual">Manual Mapping</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="mt-4">
            {renderAIView()}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            {renderManualView()}
          </TabsContent>
        </Tabs>

        {/* Validation warning */}
        {!isValid && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please map at least the Company Name field to continue
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isAnalyzing}
            className="flex-1"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Confirm Mapping & Import"
            )}
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
