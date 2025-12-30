"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Mail,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Heart,
  Handshake,
  AlertCircle,
} from "lucide-react"
import type { Startup } from "@/lib/types"
import type { RejectionTone, RejectionMessages } from "@/lib/rejection-generator"

interface RejectionEmailsProps {
  startup: Startup
}

export function RejectionEmailsComponent({ startup }: RejectionEmailsProps) {
  const [rejectionTone, setRejectionTone] = useState<RejectionTone>("encouraging")
  const [rejectionMessages, setRejectionMessages] = useState<RejectionMessages | null>(null)
  const [isGeneratingRejection, setIsGeneratingRejection] = useState(false)
  const [copiedRejectionType, setCopiedRejectionType] = useState<string | null>(null)
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const handleGenerateRejection = async () => {
    setIsGeneratingRejection(true)
    setRejectionMessages(null)
    try {
      const response = await fetch("/api/generate-rejection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startup,
          tone: rejectionTone,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate rejection emails")
      }

      const data = await response.json()
      setRejectionMessages(data.messages)
    } catch (error) {
      console.error("Error generating rejection emails:", error)
    } finally {
      setIsGeneratingRejection(false)
    }
  }

  const handleCopyRejectionMessage = (type: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedRejectionType(type)
    // Clear previous timeout if exists
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }
    copyTimeoutRef.current = setTimeout(() => setCopiedRejectionType(null), 2000)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold mb-2">Rejection Emails</h3>
            <p className="text-muted-foreground">
              Generate professional rejection emails for {startup.name} that maintain the relationship and provide value to the founder.
            </p>
          </div>
        </div>

        {/* Tone Selector and Generate Button */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 max-w-xs">
            <Label className="text-sm font-medium mb-2 block">Email Tone</Label>
            <Select
              value={rejectionTone}
              onValueChange={(value) => setRejectionTone(value as RejectionTone)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encouraging">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" />
                    <span>Encouraging</span>
                  </div>
                </SelectItem>
                <SelectItem value="constructive">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span>Constructive</span>
                  </div>
                </SelectItem>
                <SelectItem value="transparent">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>Transparent</span>
                  </div>
                </SelectItem>
                <SelectItem value="formal">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>Formal</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="pt-6">
            <Button
              onClick={handleGenerateRejection}
              disabled={isGeneratingRejection}
              size="lg"
            >
              {isGeneratingRejection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Generate Emails
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tone Descriptions */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className={`p-3 rounded-lg border ${rejectionTone === "encouraging" ? "border-pink-300 bg-pink-50 dark:bg-pink-950/20" : "border-muted"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="font-medium text-sm">Encouraging</span>
            </div>
            <p className="text-xs text-muted-foreground">Warm, optimistic, emphasizes founder's strengths</p>
          </div>
          <div className={`p-3 rounded-lg border ${rejectionTone === "constructive" ? "border-blue-300 bg-blue-50 dark:bg-blue-950/20" : "border-muted"}`}>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">Constructive</span>
            </div>
            <p className="text-xs text-muted-foreground">Balanced, provides actionable feedback</p>
          </div>
          <div className={`p-3 rounded-lg border ${rejectionTone === "transparent" ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20" : "border-muted"}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-sm">Transparent</span>
            </div>
            <p className="text-xs text-muted-foreground">Direct about reasons, honest but kind</p>
          </div>
          <div className={`p-3 rounded-lg border ${rejectionTone === "formal" ? "border-gray-300 bg-gray-50 dark:bg-gray-950/20" : "border-muted"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Formal</span>
            </div>
            <p className="text-xs text-muted-foreground">Professional, polished, minimal detail</p>
          </div>
        </div>
      </Card>

      {/* Generated Messages */}
      {rejectionMessages && (
        <div className="grid grid-cols-2 gap-4">
          {/* Formal Rejection */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-600" />
                Formal Rejection
              </h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyRejectionMessage(
                    "formal",
                    `Subject: ${rejectionMessages.formalRejection.subject}\n\n${rejectionMessages.formalRejection.body}`
                  )
                }
              >
                {copiedRejectionType === "formal" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-sm font-medium mb-2 text-muted-foreground border-b pb-2">
              {rejectionMessages.formalRejection.subject}
            </div>
            <div className="text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {rejectionMessages.formalRejection.body}
            </div>
          </Card>

          {/* Constructive Feedback */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Constructive Feedback
              </h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyRejectionMessage(
                    "constructive",
                    `Subject: ${rejectionMessages.constructiveFeedback.subject}\n\n${rejectionMessages.constructiveFeedback.body}`
                  )
                }
              >
                {copiedRejectionType === "constructive" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-sm font-medium mb-2 text-muted-foreground border-b pb-2">
              {rejectionMessages.constructiveFeedback.subject}
            </div>
            <div className="text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {rejectionMessages.constructiveFeedback.body}
            </div>
          </Card>

          {/* Future Opportunity */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-pink-600" />
                Future Opportunity
              </h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyRejectionMessage(
                    "future",
                    `Subject: ${rejectionMessages.futureOpportunity.subject}\n\n${rejectionMessages.futureOpportunity.body}`
                  )
                }
              >
                {copiedRejectionType === "future" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-sm font-medium mb-2 text-muted-foreground border-b pb-2">
              {rejectionMessages.futureOpportunity.subject}
            </div>
            <div className="text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {rejectionMessages.futureOpportunity.body}
            </div>
          </Card>

          {/* Warm Introduction */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold flex items-center gap-2">
                <Handshake className="h-4 w-4 text-green-600" />
                Warm Introduction Offer
              </h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleCopyRejectionMessage(
                    "warm",
                    `Subject: ${rejectionMessages.warmIntroduction.subject}\n\n${rejectionMessages.warmIntroduction.body}`
                  )
                }
              >
                {copiedRejectionType === "warm" ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="text-sm font-medium mb-2 text-muted-foreground border-b pb-2">
              {rejectionMessages.warmIntroduction.subject}
            </div>
            <div className="text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {rejectionMessages.warmIntroduction.body}
            </div>
          </Card>
        </div>
      )}

      {/* Empty state when no messages and not generating */}
      {!rejectionMessages && !isGeneratingRejection && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Mail className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <h4 className="text-lg font-medium mb-2">No Emails Generated Yet</h4>
            <p className="text-sm">Select a tone above and click "Generate Emails" to create professional rejection emails</p>
          </div>
        </Card>
      )}
    </div>
  )
}
