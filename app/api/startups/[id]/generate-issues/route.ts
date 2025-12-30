import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

// POST /api/startups/[id]/generate-issues - Generate threshold issues from scorecard commentary
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get the startup with its scorecard data
    const startup = await prisma.startup.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        investmentScorecard: true,
      },
    })

    if (!startup) {
      return NextResponse.json({ error: "Startup not found" }, { status: 404 })
    }

    // Check if there are scorecards with commentary
    const scorecards = (startup.investmentScorecard as any) || []
    if (!Array.isArray(scorecards) || scorecards.length === 0) {
      return NextResponse.json({ error: "No scorecards found for this startup" }, { status: 400 })
    }

    // Collect all commentary from all scorecards
    const allCommentary: { section: string; criterion: string; comment: string; score: number }[] = []

    for (const scorecard of scorecards) {
      if (scorecard.comments) {
        for (const [key, comment] of Object.entries(scorecard.comments)) {
          if (comment && typeof comment === "string" && comment.trim()) {
            const [section, criterion] = key.split("-")
            const score = scorecard.scores[key] || 0
            allCommentary.push({ section, criterion, comment: comment.trim(), score })
          }
        }
      }
    }

    if (allCommentary.length === 0) {
      return NextResponse.json({ error: "No commentary found in scorecards" }, { status: 400 })
    }

    console.log(`[Generate Issues] Analyzing ${allCommentary.length} comments for startup: ${startup.name}`)

    // Use Claude Sonnet 4 to analyze commentary and extract threshold issues
    const prompt = `You are an expert venture capital analyst. Analyze the following investment scorecard commentary for "${startup.name}" and identify **deal breakers and critical red flags** that would take you out of investing entirely or require extraordinary resolution.

For each identified issue, provide:
1. Category: One of [Market Risk, Team Risk, Technology Risk, Legal Risk, Financial Risk, Competitive Risk, Execution Risk, Other]
2. Issue: A clear description of the deal breaker or red flag (2-3 sentences)
3. Risk Rating:
   - High = Deal breaker (would prevent investment without resolution)
   - Medium = Major red flag (requires significant resolution before proceeding)
   - Low = Yellow flag (serious concern but potentially addressable)
4. Mitigation: Specific recommendations to address or mitigate the risk (2-3 sentences)

IMPORTANT - BE HIGHLY SELECTIVE:
- Only flag issues that would genuinely **prevent or severely impact** the investment decision
- Focus on fundamental flaws, critical risks, and serious red flags (not minor concerns)
- Low scores (1-4) with strongly negative commentary indicate potential deal breakers
- High scores (8-10) with positive commentary are NOT risks - do not flag them
- If commentary is neutral or describes manageable issues, don't force an issue
- Ask yourself: "Would this issue alone cause us to pass on this deal?"
- Avoid duplicates - if multiple comments mention the same risk, consolidate into one issue
- Don't flag issues that can be easily mitigated or are standard startup challenges

Commentary Data:
${allCommentary
  .map(
    (c, i) =>
      `${i + 1}. [${c.section} - ${c.criterion}] (Score: ${c.score}/10)
Comment: ${c.comment}`,
  )
  .join("\n\n")}

Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "issues": [
    {
      "category": "Market Risk",
      "issue": "Issue description here",
      "riskRating": "High",
      "mitigation": "Mitigation strategy here"
    }
  ]
}

If no genuine risks are identified, return: {"issues": []}`

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for more consistent analysis
      system:
        "You are a venture capital analyst expert at identifying deal-breaking red flags and critical threshold issues that would prevent investment. Be highly selective - only flag serious issues that would genuinely cause you to pass on the deal. Return only valid JSON.",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    })

    // Safely extract response text with proper null checks
    const firstContent = completion.content?.[0]
    const responseText = firstContent && firstContent.type === "text" ? firstContent.text.trim() : ""
    if (!responseText) {
      throw new Error("Empty response from Claude Sonnet 4")
    }

    console.log(`[Generate Issues] Claude Sonnet 4 response: ${responseText.substring(0, 200)}...`)

    // Parse the response
    let parsedResponse: { issues: any[] }
    try {
      parsedResponse = JSON.parse(responseText)
    } catch (parseError) {
      console.error("[Generate Issues] Failed to parse Claude Sonnet 4 response:", responseText)
      throw new Error("Invalid JSON response from AI model")
    }

    const extractedIssues = parsedResponse.issues || []

    if (extractedIssues.length === 0) {
      return NextResponse.json({
        message: "No threshold issues identified from the scorecard commentary",
        count: 0,
      })
    }

    // Create the issues in the database (append, avoid duplicates)
    const existingIssues = await prisma.thresholdIssue.findMany({
      where: { startupId: id },
      select: { issue: true },
    })

    const existingIssueTexts = new Set(existingIssues.map((i) => i.issue.toLowerCase().trim()))

    const issuesToCreate = extractedIssues.filter((issue) => {
      const issueText = issue.issue.toLowerCase().trim()
      return !existingIssueTexts.has(issueText)
    })

    if (issuesToCreate.length === 0) {
      return NextResponse.json({
        message: "All identified issues already exist",
        count: 0,
        skipped: extractedIssues.length,
      })
    }

    const createdIssues = await prisma.thresholdIssue.createMany({
      data: issuesToCreate.map((issue) => ({
        startupId: id,
        category: issue.category,
        issue: issue.issue,
        riskRating: issue.riskRating,
        mitigation: issue.mitigation,
        status: "Open",
        source: "AI", // Mark as AI-generated
        identifiedDate: new Date().toISOString().split("T")[0],
      })),
    })

    console.log(
      `[Generate Issues] Created ${createdIssues.count} new issues (skipped ${extractedIssues.length - issuesToCreate.length} duplicates)`,
    )

    return NextResponse.json({
      message: `Successfully generated ${createdIssues.count} threshold issues`,
      count: createdIssues.count,
      skipped: extractedIssues.length - issuesToCreate.length,
    })
  } catch (error) {
    console.error("[Generate Issues] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to generate threshold issues",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
