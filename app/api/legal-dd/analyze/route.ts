import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

interface UploadedDocument {
  id: string
  fileName: string
  fileType: string
  text: string
  uploadedAt: string
  characterCount: number
  wordCount: number
}

// Checklist items by category for AI analysis context
const CHECKLIST_ITEMS: Record<string, { key: string; label: string }[]> = {
  mobilisation: [
    { key: "setupDealStructures", label: "Setup deal structures - Lighthouse, Shared Folders" },
    { key: "communicateTeamDetails", label: "Communicate team details to target company" },
    { key: "sourceDocumentation", label: "Source available documentation - Shareholder agreement draft, term sheet etc" },
    { key: "arrangeFollowUpQA", label: "Arrange follow up Q&A for IC validation" },
    { key: "legalCounselOnCall", label: "Legal counsel on call / engaged" },
    { key: "advisePolarCapital", label: "Advise capital partner and have them prepared" },
  ],
  dealTerms: [
    { key: "roundEconomics", label: "Confirm pre-money cap, round size, our cheque, dilution math, and instrument type" },
    { key: "positionSizing", label: "Check position sizing vs Fund strategy: % of fund, follow-on expectations, signaling risk" },
    { key: "leadInvestorAlignment", label: "Confirm lead investor terms are standard (no weird side letters / seniority)" },
  ],
  instrument: [
    { key: "safeEconomics", label: "Review SAFE for: valuation cap, discount, MFN, pro rata rights, transferability, carve-outs" },
    { key: "conversionTerms", label: "Confirm how/when SAFE converts into equity on next priced round" },
    { key: "liabilityClause", label: "Include limitation of liability clause" },
  ],
  capTable: [
    { key: "preMoneyCapTable", label: "Get current fully diluted cap table (founders, angels, notes/SAFEs)" },
    { key: "legacyShareholders", label: "Confirm no legacy shareholders or problematic advisory grants" },
    { key: "optionPool", label: "Confirm pre-money ESOP pool size and where it sits (pre or post money)" },
  ],
  founderEquity: [
    { key: "founderVesting", label: "Confirm 4-year vesting with 1-year cliff (or equivalent remaining vest)" },
    { key: "acceleratedVesting", label: "Confirm accelerated vesting is 'good leaver' only, bad leaver gets unvested stripped" },
    { key: "founderLockIn", label: "Check that founders can't leave day 1 with significant equity" },
    { key: "leaverClauses", label: "Check framing of founder leaver clauses - for cause etc" },
  ],
  ipAssignment: [
    { key: "ipOwnership", label: "Obtain IP assignment deeds - all code, design, brand, domains owned by company" },
    { key: "priorEmployerIP", label: "Confirm founders not restricted by prior employers (non-compete, non-solicit, IP claims)" },
    { key: "founderIPWarranty", label: "Ask founders to warrant in writing that they are free and clear of IP restrictions" },
  ],
  regulatory: [
    { key: "licensesNeeded", label: "High-level confirm what licenses are needed for their model" },
    { key: "regulatoryPlan", label: "Check they have a credible regulatory plan (not 'we'll wing it')" },
    { key: "complianceOwner", label: "Check there is a named person accountable for compliance, AML/CTF, credit risk" },
  ],
  businessModel: [
    { key: "unitEconomics", label: "Develop baseline model for low, base and high case on customer lifecycle assumptions" },
    { key: "externalFunderDependency", label: "Identify if business model hinges on external capital partners" },
  ],
  governance: [
    { key: "informationRights", label: "Confirm information rights - financials, board materials, material events" },
    { key: "antiDilution", label: "Check for anti-dilution protections (weighted average vs full ratchet)" },
    { key: "preEmptiveRights", label: "Ensure right to participate in future funding rounds pro rata" },
    { key: "mfnClause", label: "Check if lead investor negotiated special rights - ensure MFN or comfortable without" },
  ],
  litigation: [
    { key: "outstandingClaims", label: "Ask founders to disclose any threatened litigation, debt, employment claims, IP disputes" },
    { key: "personalIssues", label: "Check for personal bankruptcy issues or other red flags" },
  ],
  documentReview: [
    { key: "shareholdersAgreement", label: "Review proposed SHA for liquidation prefs, founder restrictions, drag/tag" },
    { key: "sideLetters", label: "Capture any side letters (info rights, advisor fees, exclusivity, board rights)" },
    { key: "capTablePostRound", label: "Access SAFE calculator and validate ownership table post-raise including ESOP" },
  ],
}

export interface AnalysisResult {
  category: string
  summary: string
  itemAnalysis: {
    key: string
    label: string
    status: "Done" | "Issue" | "Pending" | "Not Found"
    findings: string
    concerns: string[]
    extractedData: string
  }[]
  overallRisk: "Low" | "Medium" | "High" | "Critical"
  keyFindings: string[]
  redFlags: string[]
  documentsAnalyzed: string[]
}

export async function POST(request: NextRequest) {
  try {
    const { startupId, category } = await request.json()

    if (!startupId || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the startup with legal diligence data
    const startup = await prisma.startup.findUnique({
      where: { id: startupId },
      select: {
        name: true,
        legalDiligence: true
      },
    })

    if (!startup) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 })
    }

    const legalDiligence = (startup.legalDiligence as any) || {}
    const uploadedDocuments = legalDiligence.uploadedDocuments || {}
    const categoryDocs = uploadedDocuments[category]

    // Handle both array and legacy single document format
    let documents: UploadedDocument[] = []
    if (Array.isArray(categoryDocs)) {
      documents = categoryDocs
    } else if (categoryDocs && categoryDocs.text) {
      // Legacy single document - migrate to array format
      documents = [{
        id: categoryDocs.id || `legacy-${Date.now()}`,
        fileName: categoryDocs.fileName,
        fileType: categoryDocs.fileType,
        text: categoryDocs.text,
        uploadedAt: categoryDocs.uploadedAt,
        characterCount: categoryDocs.characterCount,
        wordCount: categoryDocs.wordCount,
      }]
    }

    if (documents.length === 0) {
      return NextResponse.json({ error: "No documents found for this category" }, { status: 404 })
    }

    const checklistItems = CHECKLIST_ITEMS[category]
    if (!checklistItems) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 })
    }

    // Combine all documents for analysis
    const documentNames = documents.map(d => d.fileName)
    const totalCharacters = documents.reduce((sum, d) => sum + d.characterCount, 0)

    console.log(`[Legal DD Analysis] Analyzing ${documents.length} documents for ${startup.name}, category: ${category}`)
    console.log(`[Legal DD Analysis] Documents: ${documentNames.join(", ")}`)
    console.log(`[Legal DD Analysis] Total characters: ${totalCharacters}`)

    // Build combined document text with clear separators
    let combinedText = ""
    const maxCharsPerDoc = Math.floor(170000 / documents.length) // Distribute context window

    documents.forEach((doc, index) => {
      const docText = doc.text.slice(0, maxCharsPerDoc)
      combinedText += `\n\n========== DOCUMENT ${index + 1}: ${doc.fileName} ==========\n\n${docText}`
    })

    // Build the analysis prompt
    const checklistItemsList = checklistItems
      .map((item, i) => `${i + 1}. [${item.key}] ${item.label}`)
      .join("\n")

    const systemPrompt = `You are a senior legal due diligence analyst for a venture capital firm. Your task is to analyze legal documents and extract relevant information for investment due diligence.

You must be thorough, precise, and flag any potential issues or red flags. Your analysis should help the investment team make informed decisions.

Key principles:
- Be specific with document names and page/section references when possible
- Cross-reference information across multiple documents when relevant
- Flag anything unusual or non-standard
- Note missing information that should be present
- Highlight terms that may be unfavorable to investors
- Identify any potential legal risks or liabilities
- Note any inconsistencies between documents`

    const analysisPrompt = `Analyze the following ${documents.length} document(s) for the "${category}" due diligence category.

DOCUMENTS TO ANALYZE:
${combinedText}

CHECKLIST ITEMS TO ANALYZE:
${checklistItemsList}

For each checklist item, provide:
1. STATUS: One of "Done" (info found and acceptable), "Issue" (found but concerning), "Pending" (needs follow-up), or "Not Found" (not in documents)
2. FINDINGS: What you found related to this item (reference specific documents where relevant)
3. CONCERNS: Any red flags or issues (array, can be empty)
4. EXTRACTED_DATA: Specific values, dates, percentages, or terms found

Also provide:
- SUMMARY: 2-3 sentence overview of the documents and their key contents
- OVERALL_RISK: "Low", "Medium", "High", or "Critical"
- KEY_FINDINGS: Array of 3-5 most important findings across all documents
- RED_FLAGS: Array of any critical issues that need immediate attention

RESPOND IN THIS EXACT JSON FORMAT:
{
  "summary": "...",
  "overallRisk": "Low|Medium|High|Critical",
  "keyFindings": ["...", "..."],
  "redFlags": ["...", "..."],
  "itemAnalysis": [
    {
      "key": "item_key",
      "status": "Done|Issue|Pending|Not Found",
      "findings": "...",
      "concerns": ["...", "..."],
      "extractedData": "..."
    }
  ]
}`

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: systemPrompt,
      prompt: analysisPrompt,
    })

    console.log(`[Legal DD Analysis] Analysis complete for ${category}`)

    // Parse the response
    let analysisResult: AnalysisResult
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonStr = text
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      } else {
        // Try to find JSON object directly
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}") + 1
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          jsonStr = text.slice(jsonStart, jsonEnd)
        }
      }

      const parsed = JSON.parse(jsonStr)

      // Add labels to item analysis
      analysisResult = {
        category,
        summary: parsed.summary || "No summary provided",
        overallRisk: parsed.overallRisk || "Medium",
        keyFindings: parsed.keyFindings || [],
        redFlags: parsed.redFlags || [],
        documentsAnalyzed: documentNames,
        itemAnalysis: (parsed.itemAnalysis || []).map((item: any) => {
          const checklistItem = checklistItems.find(ci => ci.key === item.key)
          return {
            ...item,
            label: checklistItem?.label || item.key,
          }
        }),
      }
    } catch (parseError) {
      console.error("[Legal DD Analysis] Failed to parse AI response:", parseError)
      console.error("[Legal DD Analysis] Raw response:", text)
      return NextResponse.json(
        { error: "Failed to parse analysis results" },
        { status: 500 }
      )
    }

    // Store the analysis results in the database
    const currentAnalysis = legalDiligence.analysisResults || {}
    const updatedLegalDiligence = {
      ...legalDiligence,
      analysisResults: {
        ...currentAnalysis,
        [category]: {
          ...analysisResult,
          analyzedAt: new Date().toISOString(),
          documentCount: documents.length,
        },
      },
    }

    await prisma.startup.update({
      where: { id: startupId },
      data: { legalDiligence: updatedLegalDiligence },
    })

    return NextResponse.json({
      analysis: analysisResult,
      analyzedAt: new Date().toISOString(),
      documentsAnalyzed: documents.length,
    })
  } catch (error) {
    console.error("[Legal DD Analysis] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to analyze document: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve previous analysis results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startupId = searchParams.get("startupId")
    const category = searchParams.get("category")

    if (!startupId) {
      return NextResponse.json({ error: "Missing startupId" }, { status: 400 })
    }

    const startup = await prisma.startup.findUnique({
      where: { id: startupId },
      select: { legalDiligence: true },
    })

    if (!startup) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 })
    }

    const legalDiligence = (startup.legalDiligence as any) || {}
    const analysisResults = legalDiligence.analysisResults || {}

    if (category) {
      return NextResponse.json({ analysis: analysisResults[category] || null })
    }

    return NextResponse.json({ analysisResults })
  } catch (error) {
    console.error("[Legal DD Analysis] GET Error:", error)
    return NextResponse.json({ error: "Failed to retrieve analysis" }, { status: 500 })
  }
}
