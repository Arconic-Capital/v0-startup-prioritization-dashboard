"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Save,
} from "lucide-react"
import type {
  InvestmentDecision,
  InvestmentVote,
  InvestmentDecisionStatus,
  DecisionCategory,
  InvestmentVoteRecord,
} from "@/lib/types"
import { DECISION_CATEGORIES } from "@/lib/types"

interface InvestmentDecisionProps {
  decision?: InvestmentDecision
  onSave: (decision: InvestmentDecision) => Promise<void>
  companyName: string
}

const DEFAULT_CATEGORY: DecisionCategory = { score: 0, rationale: "" }

const DEFAULT_DECISION: InvestmentDecision = {
  decision: "pending",
  votes: [],
  categories: {
    team: { ...DEFAULT_CATEGORY },
    market: { ...DEFAULT_CATEGORY },
    product: { ...DEFAULT_CATEGORY },
    traction: { ...DEFAULT_CATEGORY },
    competition: { ...DEFAULT_CATEGORY },
    dealTerms: { ...DEFAULT_CATEGORY },
  },
  reasonsToInvest: [],
  reasonsNotToInvest: [],
  additionalContext: "",
}

export function InvestmentDecisionComponent({
  decision: initialDecision,
  onSave,
  companyName,
}: InvestmentDecisionProps) {
  const [decision, setDecision] = useState<InvestmentDecision>(
    initialDecision || DEFAULT_DECISION
  )
  const [isSaving, setIsSaving] = useState(false)
  const [newVoterName, setNewVoterName] = useState("")
  const [newReasonToInvest, setNewReasonToInvest] = useState("")
  const [newReasonNotToInvest, setNewReasonNotToInvest] = useState("")

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(decision)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCategoryChange = (
    categoryKey: keyof typeof decision.categories,
    field: keyof DecisionCategory,
    value: string | number
  ) => {
    setDecision((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryKey]: {
          ...prev.categories[categoryKey],
          [field]: value,
        },
      },
    }))
  }

  const addVote = () => {
    if (!newVoterName.trim()) return
    const newVote: InvestmentVoteRecord = {
      name: newVoterName.trim(),
      vote: "abstain",
      rationale: "",
      timestamp: new Date().toISOString(),
    }
    setDecision((prev) => ({
      ...prev,
      votes: [...prev.votes, newVote],
    }))
    setNewVoterName("")
  }

  const updateVote = (
    index: number,
    field: keyof InvestmentVoteRecord,
    value: string
  ) => {
    setDecision((prev) => ({
      ...prev,
      votes: prev.votes.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      ),
    }))
  }

  const removeVote = (index: number) => {
    setDecision((prev) => ({
      ...prev,
      votes: prev.votes.filter((_, i) => i !== index),
    }))
  }

  const addReasonToInvest = () => {
    if (!newReasonToInvest.trim()) return
    setDecision((prev) => ({
      ...prev,
      reasonsToInvest: [...prev.reasonsToInvest, newReasonToInvest.trim()],
    }))
    setNewReasonToInvest("")
  }

  const addReasonNotToInvest = () => {
    if (!newReasonNotToInvest.trim()) return
    setDecision((prev) => ({
      ...prev,
      reasonsNotToInvest: [...prev.reasonsNotToInvest, newReasonNotToInvest.trim()],
    }))
    setNewReasonNotToInvest("")
  }

  const removeReason = (type: "invest" | "notInvest", index: number) => {
    if (type === "invest") {
      setDecision((prev) => ({
        ...prev,
        reasonsToInvest: prev.reasonsToInvest.filter((_, i) => i !== index),
      }))
    } else {
      setDecision((prev) => ({
        ...prev,
        reasonsNotToInvest: prev.reasonsNotToInvest.filter((_, i) => i !== index),
      }))
    }
  }

  const getDecisionIcon = (status: InvestmentDecisionStatus) => {
    switch (status) {
      case "invest":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "pass":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "more_info":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getDecisionColor = (status: InvestmentDecisionStatus) => {
    switch (status) {
      case "invest":
        return "bg-green-100 text-green-800 border-green-300"
      case "pass":
        return "bg-red-100 text-red-800 border-red-300"
      case "more_info":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getVoteIcon = (vote: InvestmentVote) => {
    switch (vote) {
      case "invest":
        return <ThumbsUp className="h-4 w-4 text-green-600" />
      case "pass":
        return <ThumbsDown className="h-4 w-4 text-red-600" />
      default:
        return <HelpCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getCategoryAverage = () => {
    const scores = Object.values(decision.categories).map((c) => c.score)
    const validScores = scores.filter((s) => s > 0)
    if (validScores.length === 0) return 0
    return Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length * 10) / 10
  }

  const getVoteSummary = () => {
    const invest = decision.votes.filter((v) => v.vote === "invest").length
    const pass = decision.votes.filter((v) => v.vote === "pass").length
    const abstain = decision.votes.filter((v) => v.vote === "abstain").length
    return { invest, pass, abstain, total: decision.votes.length }
  }

  const voteSummary = getVoteSummary()

  return (
    <div className="space-y-6">
      {/* Header with Overall Decision */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold mb-2">Investment Decision</h3>
            <p className="text-muted-foreground">
              Final investment committee decision for {companyName}
            </p>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Decision"}
          </Button>
        </div>

        {/* Decision Status */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {(["pending", "more_info", "invest", "pass"] as InvestmentDecisionStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => setDecision((prev) => ({ ...prev, decision: status }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  decision.decision === status
                    ? getDecisionColor(status) + " ring-2 ring-offset-2"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getDecisionIcon(status)}
                  <span className="font-semibold capitalize">
                    {status === "more_info" ? "More Info Needed" : status}
                  </span>
                </div>
              </button>
            )
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Category Average</div>
            <div className="text-3xl font-bold">{getCategoryAverage()}/10</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">IC Votes</div>
            <div className="flex items-center gap-3">
              <span className="text-green-600 font-semibold">{voteSummary.invest} Invest</span>
              <span className="text-red-600 font-semibold">{voteSummary.pass} Pass</span>
              <span className="text-gray-500">{voteSummary.abstain} Abstain</span>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Decision Date</div>
            <Input
              type="date"
              value={decision.decisionDate || ""}
              onChange={(e) =>
                setDecision((prev) => ({ ...prev, decisionDate: e.target.value }))
              }
              className="h-8"
            />
          </div>
        </div>
      </Card>

      {/* IC Member Votes */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-600" />
          <h4 className="text-lg font-semibold">Investment Committee Votes</h4>
        </div>

        <div className="space-y-4">
          {decision.votes.map((vote, index) => (
            <div
              key={`${vote.name}-${vote.timestamp}`}
              className="border rounded-lg p-4 bg-muted/30"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="font-semibold">{vote.name}</div>
                  <Select
                    value={vote.vote}
                    onValueChange={(value) => updateVote(index, "vote", value)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <div className="flex items-center gap-2">
                        {getVoteIcon(vote.vote as InvestmentVote)}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invest">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                          Invest
                        </div>
                      </SelectItem>
                      <SelectItem value="pass">
                        <div className="flex items-center gap-2">
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                          Pass
                        </div>
                      </SelectItem>
                      <SelectItem value="abstain">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                          Abstain
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeVote(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Add rationale for this vote..."
                value={vote.rationale || ""}
                onChange={(e) => updateVote(index, "rationale", e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          ))}

          {/* Add new voter */}
          <div className="flex gap-2">
            <Input
              placeholder="Add IC member name..."
              value={newVoterName}
              onChange={(e) => setNewVoterName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newVoterName.trim() && addVote()}
              className={!newVoterName.trim() ? "" : "border-green-300"}
            />
            <Button
              onClick={addVote}
              variant="outline"
              disabled={!newVoterName.trim()}
              title={!newVoterName.trim() ? "Enter a name first" : "Add voter"}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Voter
            </Button>
          </div>
        </div>
      </Card>

      {/* Category Scoring */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold mb-4">Decision Categories</h4>
        <p className="text-sm text-muted-foreground mb-6">
          Score each category from 1-10 and provide rationale for the assessment
        </p>

        <div className="space-y-6">
          {DECISION_CATEGORIES.map((category) => {
            const categoryData =
              decision.categories[category.key as keyof typeof decision.categories]
            return (
              <div key={category.key} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-semibold">{category.label}</h5>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={categoryData.score || ""}
                      onChange={(e) =>
                        handleCategoryChange(
                          category.key as keyof typeof decision.categories,
                          "score",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-20 text-center"
                    />
                    <span className="text-sm text-muted-foreground">/ 10</span>
                  </div>
                </div>
                <Textarea
                  placeholder={`Why did you score ${category.label.toLowerCase()} this way?`}
                  value={categoryData.rationale}
                  onChange={(e) =>
                    handleCategoryChange(
                      category.key as keyof typeof decision.categories,
                      "rationale",
                      e.target.value
                    )
                  }
                  className="min-h-[80px]"
                />
              </div>
            )
          })}
        </div>
      </Card>

      {/* Reasons To Invest / Not Invest */}
      <div className="grid grid-cols-2 gap-6">
        {/* Reasons to Invest */}
        <Card className="p-6 border-green-200 bg-green-50/30 dark:bg-green-950/10">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsUp className="h-5 w-5 text-green-600" />
            <h4 className="text-lg font-semibold text-green-800 dark:text-green-400">
              Reasons to Invest
            </h4>
          </div>

          <div className="space-y-2 mb-4">
            {decision.reasonsToInvest.map((reason, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 bg-white dark:bg-background rounded p-3 border border-green-200"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{reason}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeReason("invest", index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add a reason to invest..."
              value={newReasonToInvest}
              onChange={(e) => setNewReasonToInvest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReasonToInvest()}
              className="bg-white dark:bg-background"
            />
            <Button onClick={addReasonToInvest} variant="outline" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Reasons NOT to Invest */}
        <Card className="p-6 border-red-200 bg-red-50/30 dark:bg-red-950/10">
          <div className="flex items-center gap-2 mb-4">
            <ThumbsDown className="h-5 w-5 text-red-600" />
            <h4 className="text-lg font-semibold text-red-800 dark:text-red-400">
              Reasons Not to Invest
            </h4>
          </div>

          <div className="space-y-2 mb-4">
            {decision.reasonsNotToInvest.map((reason, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-2 bg-white dark:bg-background rounded p-3 border border-red-200"
              >
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{reason}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeReason("notInvest", index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Add a concern or reason not to invest..."
              value={newReasonNotToInvest}
              onChange={(e) => setNewReasonNotToInvest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addReasonNotToInvest()}
              className="bg-white dark:bg-background"
            />
            <Button onClick={addReasonNotToInvest} variant="outline" size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Additional Context & Next Steps */}
      <Card className="p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-base font-semibold mb-2 block">
              Additional Context
            </Label>
            <p className="text-sm text-muted-foreground mb-3">
              Any other relevant information, discussions, or considerations
            </p>
            <Textarea
              placeholder="Add any additional context about the investment decision..."
              value={decision.additionalContext}
              onChange={(e) =>
                setDecision((prev) => ({
                  ...prev,
                  additionalContext: e.target.value,
                }))
              }
              className="min-h-[150px]"
            />
          </div>
          <div>
            <Label className="text-base font-semibold mb-2 block">Next Steps</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Action items and follow-up tasks after the decision
            </p>
            <Textarea
              placeholder="What are the next steps? (e.g., term sheet negotiation, additional DD, etc.)"
              value={decision.nextSteps || ""}
              onChange={(e) =>
                setDecision((prev) => ({ ...prev, nextSteps: e.target.value }))
              }
              className="min-h-[150px]"
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
