import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseFoundersFromStartups } from "@/lib/founder-parser"
import { normalizeFounderName, createOrUpdateFounder, linkFounderToCompany, findCompanyByName } from "@/lib/founder-matcher"
import type { FounderWithCompanies } from "@/lib/types"

// GET /api/founders - List all founders (both legacy and database)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase() || ""
    const page = Number(searchParams.get("page") || "1")
    const limit = Number(searchParams.get("limit") || "50")
    const source = searchParams.get("source") || "all" // "all", "database", "legacy"
    const includeCompanies = searchParams.get("includeCompanies") === "true"

    let allFounders: unknown[] = []

    // Get database founders
    if (source === "all" || source === "database") {
      const dbWhere = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { normalizedName: { contains: search, mode: 'insensitive' as const } },
          { bio: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}

      const dbFounders = await prisma.founder.findMany({
        where: dbWhere,
        include: includeCompanies ? {
          companies: {
            include: {
              startup: {
                select: {
                  id: true,
                  name: true,
                  sector: true,
                  country: true,
                  rank: true,
                  pipelineStage: true,
                }
              }
            }
          }
        } : undefined,
        orderBy: { name: 'asc' },
        take: 500, // Limit to prevent loading too many at once
      })

      // Mark as database source
      const markedDbFounders = dbFounders.map(f => ({
        ...f,
        _source: 'database' as const,
        _isNormalized: true,
      }))

      allFounders = [...allFounders, ...markedDbFounders]
    }

    // Get legacy founders (parsed from JSON)
    // Limit to 500 startups max to prevent performance issues with 10k+ companies
    if (source === "all" || source === "legacy") {
      // Apply search filter at database level for better performance
      const startupWhere = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sector: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {}

      const startups = await prisma.startup.findMany({
        where: startupWhere,
        select: {
          id: true,
          name: true,
          sector: true,
          country: true,
          description: true,
          rank: true,
          pipelineStage: true,
          companyInfo: true,
          teamInfo: true,
        },
        orderBy: { rank: "asc" },
        take: 500, // Limit to prevent loading entire database
      })

      let legacyFounders = parseFoundersFromStartups(startups)

      // Apply additional search filter on parsed founders
      if (search) {
        legacyFounders = legacyFounders.filter(f =>
          f.name.toLowerCase().includes(search) ||
          f.companyName.toLowerCase().includes(search) ||
          (f.education?.toLowerCase().includes(search)) ||
          (f.priorExperience?.toLowerCase().includes(search)) ||
          (f.companySector?.toLowerCase().includes(search))
        )
      }

      // Mark as legacy source
      const markedLegacyFounders = legacyFounders.map(f => ({
        ...f,
        _source: 'legacy' as const,
        _isNormalized: false,
      }))

      allFounders = [...allFounders, ...markedLegacyFounders]
    }

    // Sort all founders by name
    allFounders.sort((a: { name?: string }, b: { name?: string }) =>
      (a.name || '').localeCompare(b.name || '')
    )

    // Calculate pagination
    const total = allFounders.length
    const totalPages = Math.ceil(total / limit)
    const skip = (page - 1) * limit
    const paginated = allFounders.slice(skip, skip + limit)

    return NextResponse.json({
      founders: paginated,
      pagination: { page, limit, total, totalPages }
    })
  } catch (error) {
    console.error("[API] Error fetching founders:", error)
    return NextResponse.json({ error: "Failed to fetch founders" }, { status: 500 })
  }
}

// POST /api/founders - Create a new founder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      linkedIn,
      title,
      bio,
      location,
      education,
      experience,
      twitter,
      github,
      website,
      skills,
      companyName,  // Optional: link to company
      role,         // Optional: role at company
      pipelineStage // Optional: pipeline stage (default: "Deal Flow")
    } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Check for existing founder by email or LinkedIn
    if (email) {
      const existingByEmail = await prisma.founder.findFirst({
        where: { email: { equals: email.toLowerCase(), mode: 'insensitive' } }
      })
      if (existingByEmail) {
        return NextResponse.json(
          { error: "A founder with this email already exists", existingId: existingByEmail.id },
          { status: 409 }
        )
      }
    }

    if (linkedIn) {
      const existingByLinkedIn = await prisma.founder.findFirst({
        where: { linkedIn: { contains: linkedIn.toLowerCase(), mode: 'insensitive' } }
      })
      if (existingByLinkedIn) {
        return NextResponse.json(
          { error: "A founder with this LinkedIn profile already exists", existingId: existingByLinkedIn.id },
          { status: 409 }
        )
      }
    }

    // Create the founder
    const founder = await createOrUpdateFounder({
      name: name.trim(),
      email: email || null,
      linkedIn: linkedIn || null,
      title: title || null,
      bio: bio || null,
      location: location || null,
      education: education ? { raw: education } : null,
      experience: experience ? { raw: experience } : null,
      twitter: twitter || null,
      github: github || null,
      website: website || null,
      skills: skills || [],
      source: 'manual',
      pipelineStage: pipelineStage || 'Screening',
    })

    // Link to company if specified
    if (companyName) {
      const company = await findCompanyByName(companyName)
      if (company) {
        await linkFounderToCompany(founder.id, company.id, role || 'Founder', true)
      }
    }

    // Fetch founder with companies
    const founderWithCompanies = await prisma.founder.findUnique({
      where: { id: founder.id },
      include: {
        companies: {
          include: {
            startup: {
              select: {
                id: true,
                name: true,
                sector: true,
                country: true,
                rank: true,
                pipelineStage: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json(founderWithCompanies, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating founder:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `Failed to create founder: ${errorMessage}` }, { status: 500 })
  }
}
