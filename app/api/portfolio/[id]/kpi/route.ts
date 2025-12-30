import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/portfolio/[id]/kpi - Get all KPI snapshots for an investment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "24")

    const snapshots = await prisma.kPISnapshot.findMany({
      where: { portfolioInvestmentId: id },
      orderBy: { date: "desc" },
      take: limit,
    })

    return NextResponse.json({ snapshots })
  } catch (error) {
    console.error("[API] Error fetching KPI snapshots:", error)
    return NextResponse.json({ error: "Failed to fetch KPI snapshots" }, { status: 500 })
  }
}

// POST /api/portfolio/[id]/kpi - Create a new KPI snapshot
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { date, ...kpis } = body

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 })
    }

    // Validate date format
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 })
    }

    // Verify investment exists
    const investment = await prisma.portfolioInvestment.findUnique({
      where: { id },
    })

    if (!investment) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 })
    }

    // Extract only valid KPI fields
    const validKPIFields = [
      "mrr",
      "arr",
      "revenue",
      "grossMargin",
      "netBurn",
      "runway",
      "cash",
      "revenueGrowthMoM",
      "revenueGrowthYoY",
      "customers",
      "newCustomers",
      "churnRate",
      "nrr",
      "ltv",
      "cac",
      "ltvCacRatio",
      "employees",
      "customKPIs",
    ]

    const kpiData: Record<string, unknown> = {
      portfolioInvestmentId: id,
      date: parsedDate,
    }

    for (const field of validKPIFields) {
      if (kpis[field] !== undefined) {
        kpiData[field] = kpis[field]
      }
    }

    // Use upsert to handle updates for the same date
    const snapshot = await prisma.kPISnapshot.upsert({
      where: {
        portfolioInvestmentId_date: {
          portfolioInvestmentId: id,
          date: parsedDate,
        },
      },
      update: kpiData,
      create: kpiData as {
        portfolioInvestmentId: string
        date: Date
        mrr?: number
        arr?: number
        revenue?: number
        grossMargin?: number
        netBurn?: number
        runway?: number
        cash?: number
        revenueGrowthMoM?: number
        revenueGrowthYoY?: number
        customers?: number
        newCustomers?: number
        churnRate?: number
        nrr?: number
        ltv?: number
        cac?: number
        ltvCacRatio?: number
        employees?: number
        customKPIs?: Record<string, unknown>
      },
    })

    return NextResponse.json({ snapshot }, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating KPI snapshot:", error)
    return NextResponse.json({ error: "Failed to create KPI snapshot" }, { status: 500 })
  }
}

// DELETE /api/portfolio/[id]/kpi - Delete a KPI snapshot (pass snapshotId in query)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const snapshotId = searchParams.get("snapshotId")

    if (!snapshotId) {
      return NextResponse.json({ error: "snapshotId is required" }, { status: 400 })
    }

    await prisma.kPISnapshot.delete({
      where: { id: snapshotId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] Error deleting KPI snapshot:", error)
    return NextResponse.json({ error: "Failed to delete KPI snapshot" }, { status: 500 })
  }
}
