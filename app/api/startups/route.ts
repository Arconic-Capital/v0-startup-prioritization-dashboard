import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/startups - List all startups with pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    const searchParams = request.nextUrl.searchParams
    const parsedPage = Number.parseInt(searchParams.get("page") || "1")
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "50")
    // Validate numeric params - use defaults if NaN or invalid
    const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage
    const limit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 50 : Math.min(parsedLimit, 10000)
    const sector = searchParams.get("sector")
    const pipelineStage = searchParams.get("pipelineStage")
    const search = searchParams.get("search")
    const parsedMinScore = searchParams.get("minScore") ? Number.parseFloat(searchParams.get("minScore")!) : undefined
    const parsedMaxScore = searchParams.get("maxScore") ? Number.parseFloat(searchParams.get("maxScore")!) : undefined
    // Validate score params - ignore if NaN
    const minScore = parsedMinScore !== undefined && !Number.isNaN(parsedMinScore) ? parsedMinScore : undefined
    const maxScore = parsedMaxScore !== undefined && !Number.isNaN(parsedMaxScore) ? parsedMaxScore : undefined

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (sector) {
      where.sector = sector
    }

    if (pipelineStage) {
      where.pipelineStage = pipelineStage
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    // Score range filtering
    if (minScore !== undefined || maxScore !== undefined) {
      where.score = {}
      if (minScore !== undefined) {
        where.score.gte = minScore
      }
      if (maxScore !== undefined) {
        where.score.lte = maxScore
      }
    }

    // ALWAYS use select for list view - only load fields needed for table/kanban display
    // This dramatically improves performance by excluding large JSON fields
    const selectFields = {
      id: true,
      name: true,
      sector: true,
      stage: true,
      country: true,
      description: true,
      score: true,
      rank: true,
      pipelineStage: true,
      aiScores: true,
      companyInfo: true, // Include for LinkedIn links
      marketInfo: true, // Include for industry/subIndustry filtering
      // Exclude large JSON fields: investmentScorecard, investmentMemo, investmentDecision,
      // legalDiligence, documents, customData - these are loaded only when viewing a specific startup
    }

    // Run count and main query in PARALLEL for better performance
    const [total, startups] = await Promise.all([
      prisma.startup.count({ where }),
      prisma.startup.findMany({
        where,
        orderBy: { rank: "asc" },
        skip,
        take: limit,
        select: selectFields,
      }),
    ])

    // Get shortlist data in a separate efficient query
    let startupsWithShortlist
    if (userId && startups.length > 0) {
      const shortlistIds = await prisma.userShortlist.findMany({
        where: {
          userId,
          startupId: { in: startups.map((s) => s.id) },
        },
        select: { startupId: true },
      })

      const shortlistedSet = new Set(shortlistIds.map((s) => s.startupId))
      startupsWithShortlist = startups.map((startup) => ({
        ...startup,
        shortlisted: shortlistedSet.has(startup.id),
      }))
    } else {
      startupsWithShortlist = startups.map((startup) => ({
        ...startup,
        shortlisted: false,
      }))
    }

    return NextResponse.json({
      startups: startupsWithShortlist,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[API] Error fetching startups:", error)
    return NextResponse.json({ error: "Failed to fetch startups" }, { status: 500 })
  }
}

// Helper function to sanitize startup data - remove fields not in schema
function sanitizeStartupData(data: any) {
  // List of valid fields in the Prisma Startup model
  const validFields = [
    "id",
    "name",
    "sector",
    "stage",
    "country",
    "description",
    "team",
    "metrics",
    "score",
    "rank",
    "feedback",
    "pipelineStage",
    "aiScores",
    "rationale",
    "detailedMetrics",
    "companyInfo",
    "marketInfo",
    "productInfo",
    "businessModelInfo",
    "salesInfo",
    "teamInfo",
    "competitiveInfo",
    "riskInfo",
    "opportunityInfo",
    "initialAssessment",
    "investmentScorecard",
    "documents",
    "userId",
    // Custom data fields from CSV import with unmapped columns
    "customData",
    "customSchema",
  ]

  // Filter out any fields not in the schema
  const sanitized: any = {}
  for (const key of validFields) {
    if (data[key] !== undefined) {
      sanitized[key] = data[key]
    }
  }

  return sanitized
}

// Helper function to recalculate all ranks based on LLM scores
// Uses optimized SQL with a single UPDATE query instead of N individual updates
async function recalculateRanks() {
  console.log("[API] Recalculating ranks with optimized SQL...")
  const startTime = Date.now()

  // Use raw SQL for much faster bulk update (single query instead of N updates)
  // This creates a CTE (Common Table Expression) that assigns row numbers based on score
  await prisma.$executeRaw`
    UPDATE "Startup"
    SET rank = ranked.new_rank
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY score DESC, name ASC) as new_rank
      FROM "Startup"
    ) AS ranked
    WHERE "Startup".id = ranked.id
  `

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const totalCount = await prisma.startup.count()
  console.log(`[API] ✓ Recalculated ranks for ${totalCount} startups in ${duration}s`)
}

// POST /api/startups - Create new startup(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if it's a bulk insert (array) or single insert
    if (Array.isArray(body)) {
      // Bulk insert - used for CSV upload
      // Sanitize each startup to remove unknown fields
      const sanitizedData = body.map((startup) => sanitizeStartupData(startup))

      console.log(`[API] Bulk inserting ${sanitizedData.length} startups...`)

      const startups = await prisma.startup.createMany({
        data: sanitizedData,
        skipDuplicates: true, // Skip if ID already exists
      })

      console.log(`[API] Successfully inserted ${startups.count} startups (rank recalculation deferred)`)

      // NOTE: Rank recalculation removed for performance with large datasets
      // Call POST /api/startups/recalculate-ranks after all batches are uploaded

      return NextResponse.json(
        {
          message: `Successfully created ${startups.count} startups`,
          count: startups.count,
        },
        { status: 201 },
      )
    }

    // Single insert
    const sanitizedData = sanitizeStartupData(body)
    const startup = await prisma.startup.create({
      data: sanitizedData,
    })

    // For single inserts, we can afford to recalculate ranks
    console.log("[API] Single insert - recalculating ranks...")
    await recalculateRanks()

    return NextResponse.json(startup, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating startup(s):", error)
    return NextResponse.json({ error: "Failed to create startup(s)" }, { status: 500 })
  }
}
