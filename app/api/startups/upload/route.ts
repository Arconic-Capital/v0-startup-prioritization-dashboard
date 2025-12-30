import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseCSVWithAIMappings } from "@/lib/csv-parser"
import type { ColumnMapping, LLMMappingSuggestion } from "@/lib/types"

// POST /api/startups/upload - Upload CSV and insert startups
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { csvText, mapping, aiMappings } = body as {
      csvText: string
      mapping: ColumnMapping
      aiMappings?: LLMMappingSuggestion[]
    }

    if (!csvText || !mapping) {
      return NextResponse.json(
        {
          error: "Missing csvText or mapping",
          details: !csvText ? "csvText is required" : "mapping is required",
        },
        { status: 400 }
      )
    }

    // Parse CSV using enhanced parser that handles custom data
    console.log("[API] Parsing CSV with AI mappings...")
    const results = parseCSVWithAIMappings(csvText, mapping, aiMappings)
    console.log(`[API] Parsed ${results.length} startups from CSV`)

    // Batch insert in chunks of 500 for performance
    const BATCH_SIZE = 500
    let totalInserted = 0

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE)

      // Convert startups to Prisma format, including custom data
      const prismaData = batch.map(({ startup, customData, customSchema }) => ({
        id: startup.id,
        name: startup.name,
        sector: startup.sector,
        stage: startup.stage,
        country: startup.country,
        description: startup.description,
        team: startup.team,
        metrics: startup.metrics,
        score: startup.score,
        rank: startup.rank,
        feedback: startup.feedback || [],
        pipelineStage: startup.pipelineStage || "Screening",
        aiScores: startup.aiScores || null,
        rationale: startup.rationale || null,
        detailedMetrics: startup.detailedMetrics || null,
        companyInfo: startup.companyInfo || null,
        marketInfo: startup.marketInfo || null,
        productInfo: startup.productInfo || null,
        businessModelInfo: startup.businessModelInfo || null,
        salesInfo: startup.salesInfo || null,
        teamInfo: startup.teamInfo || null,
        competitiveInfo: startup.competitiveInfo || null,
        riskInfo: startup.riskInfo || null,
        opportunityInfo: startup.opportunityInfo || null,
        initialAssessment: startup.initialAssessment || null,
        investmentScorecard: startup.investmentScorecard || null,
        documents: startup.documents || null,
        // Include custom data from unmapped CSV columns
        customData: Object.keys(customData).length > 0 ? customData : null,
        customSchema: Object.keys(customSchema).length > 0 ? customSchema : null,
      }))

      const result = await prisma.startup.createMany({
        data: prismaData,
        skipDuplicates: true,
      })

      totalInserted += result.count
      console.log(`[API] Inserted batch ${i / BATCH_SIZE + 1}: ${result.count} records`)
    }

    return NextResponse.json(
      {
        message: `Successfully uploaded ${totalInserted} startups`,
        total: results.length,
        inserted: totalInserted,
        skipped: results.length - totalInserted,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[API] Error uploading CSV:", error)
    return NextResponse.json(
      {
        error: "Failed to upload CSV",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
