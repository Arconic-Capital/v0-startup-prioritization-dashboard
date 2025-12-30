import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/portfolio/[id] - Get a single portfolio investment with all related data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const investment = await prisma.portfolioInvestment.findUnique({
      where: { id },
      include: {
        startup: true,
        followOnInvestments: {
          orderBy: { date: "desc" },
        },
        milestones: {
          orderBy: { date: "desc" },
          take: 20,
        },
        updates: {
          orderBy: { date: "desc" },
          take: 10,
        },
        boardMeetings: {
          orderBy: { date: "desc" },
          take: 10,
        },
        communications: {
          orderBy: { date: "desc" },
          take: 20,
        },
        kpiSnapshots: {
          orderBy: { date: "desc" },
          take: 24, // 2 years of monthly data
        },
      },
    })

    if (!investment) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 })
    }

    // Calculate total invested including follow-ons
    const followOnTotal = investment.followOnInvestments.reduce((sum, fo) => sum + fo.amount, 0)
    const totalInvested = investment.investmentAmount + followOnTotal

    // Calculate current value
    const currentValue =
      investment.currentValuation && investment.currentEquityPct
        ? (investment.currentValuation * investment.currentEquityPct) / 100
        : null

    // Calculate MOIC
    const moic = currentValue ? currentValue / totalInvested : null

    // Calculate unrealized gain
    const unrealizedGain = currentValue ? currentValue - totalInvested : null

    return NextResponse.json({
      investment: {
        ...investment,
        totalInvested,
        currentValue,
        moic,
        unrealizedGain,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching portfolio investment:", error)
    return NextResponse.json({ error: "Failed to fetch portfolio investment" }, { status: 500 })
  }
}

// PUT /api/portfolio/[id] - Update a portfolio investment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check if investment exists
    const existing = await prisma.portfolioInvestment.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 })
    }

    // Prepare update data - only include fields that are provided
    const updateData: Record<string, unknown> = {}

    // Validate status enum if provided
    const validStatuses = ["active", "exited", "written_off"] as const
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status. Must be one of: active, exited, written_off" }, { status: 400 })
    }

    const allowedFields = [
      "investmentDate",
      "investmentAmount",
      "investmentRound",
      "investmentType",
      "leadInvestor",
      "boardSeat",
      "boardObserver",
      "preMoneyValuation",
      "postMoneyValuation",
      "equityPercentage",
      "currentValuation",
      "currentEquityPct",
      "lastValuationDate",
      "status",
      "proRataRights",
      "proRataAmount",
      "exitDate",
      "exitType",
      "exitAmount",
      "exitMultiple",
      "acquirer",
      "investmentThesis",
      "notes",
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Convert date strings to Date objects
        if (["investmentDate", "lastValuationDate", "exitDate"].includes(field) && body[field]) {
          updateData[field] = new Date(body[field])
        } else {
          updateData[field] = body[field]
        }
      }
    }

    // If updating valuation, update lastValuationDate
    if (body.currentValuation !== undefined && !body.lastValuationDate) {
      updateData.lastValuationDate = new Date()
    }

    // If marking as exited, calculate exit multiple if not provided
    if (body.status === "exited" && body.exitAmount && !body.exitMultiple) {
      const followOns = await prisma.followOnInvestment.findMany({
        where: { portfolioInvestmentId: id },
      })
      const totalInvested =
        existing.investmentAmount + followOns.reduce((sum, fo) => sum + fo.amount, 0)
      updateData.exitMultiple = body.exitAmount / totalInvested
    }

    const investment = await prisma.portfolioInvestment.update({
      where: { id },
      data: updateData,
      include: {
        startup: {
          select: {
            id: true,
            name: true,
            sector: true,
          },
        },
      },
    })

    return NextResponse.json({ investment })
  } catch (error) {
    console.error("[API] Error updating portfolio investment:", error)
    return NextResponse.json({ error: "Failed to update portfolio investment" }, { status: 500 })
  }
}

// DELETE /api/portfolio/[id] - Delete a portfolio investment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.portfolioInvestment.findUnique({
      where: { id },
      select: { startupId: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 })
    }

    // Delete the portfolio investment (cascades to related records)
    await prisma.portfolioInvestment.delete({
      where: { id },
    })

    // Update startup pipeline stage back to "Term Sheet" or "Due Diligence"
    await prisma.startup.update({
      where: { id: existing.startupId },
      data: { pipelineStage: "Term Sheet" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error deleting portfolio investment:", error)
    return NextResponse.json({ error: "Failed to delete portfolio investment" }, { status: 500 })
  }
}
