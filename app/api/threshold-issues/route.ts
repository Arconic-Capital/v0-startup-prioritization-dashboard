import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST /api/threshold-issues - Create a new threshold issue
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { startupId, category, issue, riskRating, mitigation, status, source, identifiedDate } = body

    if (!startupId || !category || !issue || !riskRating || !mitigation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate riskRating enum
    const validRiskRatings = ["High", "Medium", "Low"] as const
    if (!validRiskRatings.includes(riskRating)) {
      return NextResponse.json({ error: "Invalid riskRating. Must be one of: High, Medium, Low" }, { status: 400 })
    }

    // Validate status enum if provided
    const validStatuses = ["Open", "In Progress", "Resolved", "Accepted Risk"] as const
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be one of: Open, In Progress, Resolved, Accepted Risk" }, { status: 400 })
    }

    const thresholdIssue = await prisma.thresholdIssue.create({
      data: {
        startupId,
        category,
        issue,
        riskRating,
        mitigation,
        status: status || "Open",
        source: source || "Manual",
        identifiedDate: identifiedDate || new Date().toISOString().split("T")[0],
      },
    })

    return NextResponse.json(thresholdIssue, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating threshold issue:", error)
    return NextResponse.json({ error: "Failed to create threshold issue" }, { status: 500 })
  }
}
