import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import type { FilterCondition, FilterField, FilterOperator } from "@/lib/filter-store"

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
})

const AVAILABLE_FIELDS = [
  { field: "name", description: "Company name" },
  { field: "description", description: "Company description - contains details about what the company does" },
  { field: "sector", description: "Business sector/category" },
  { field: "country", description: "Country of headquarters" },
  { field: "score", description: "AI score (0-100)" },
  { field: "rank", description: "Overall ranking (1 = best)" },
  { field: "industry", description: "Industry category" },
  { field: "subIndustry", description: "Sub-industry or vertical" },
  { field: "b2bOrB2c", description: "Business model type (B2B, B2C, B2B2C)" },
  { field: "employeeCount", description: "Number of employees" },
  { field: "foundedYear", description: "Year company was founded" },
  { field: "fundingRaised", description: "Total funding raised" },
  { field: "problemSolved", description: "Problem the product solves" },
  { field: "moat", description: "Competitive moat or advantage" },
  { field: "revenueModel", description: "How the company makes money" },
  { field: "salesMotion", description: "Sales approach (PLG, enterprise, etc.)" },
  { field: "pipelineStage", description: "Deal pipeline stage" },
]

const AVAILABLE_OPERATORS = [
  { operator: "contains", description: "Field contains the value (text)" },
  { operator: "not_contains", description: "Field does not contain the value (text)" },
  { operator: "equals", description: "Field exactly equals the value" },
  { operator: "not_equals", description: "Field does not equal the value" },
  { operator: "greater_than", description: "Field is greater than the value (numbers)" },
  { operator: "less_than", description: "Field is less than the value (numbers)" },
]

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Validate query - check for empty string and max length
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return NextResponse.json({ error: "Query cannot be empty" }, { status: 400 })
    }
    if (trimmedQuery.length > 500) {
      return NextResponse.json({ error: "Query is too long (max 500 characters)" }, { status: 400 })
    }

    console.log("[Filter AI] Processing query:", query)

    const systemPrompt = `You are an AI assistant that converts natural language queries into structured filter conditions for a startup database.

Available fields to filter on:
${AVAILABLE_FIELDS.map((f) => `- ${f.field}: ${f.description}`).join("\n")}

Available operators:
${AVAILABLE_OPERATORS.map((o) => `- ${o.operator}: ${o.description}`).join("\n")}

Your task: Convert the user's natural language query into a JSON array of filter conditions.

Rules:
1. Each condition must have: field, operator, value
2. Use "contains" for text searches (most common)
3. Use "greater_than" / "less_than" for numeric comparisons
4. For B2B/B2C queries, search in both "b2bOrB2c" field AND "description" field
5. For AI-related queries, search "description" for keywords like "AI", "machine learning", "LLM", etc.
6. For industry queries (healthcare, fintech, etc.), search both "industry" and "description"
7. Be generous with conditions - add multiple if the query implies several criteria
8. Always return valid JSON array

Example query: "B2B healthcare startups with AI"
Example response:
[
  {"field": "description", "operator": "contains", "value": "B2B"},
  {"field": "description", "operator": "contains", "value": "healthcare"},
  {"field": "description", "operator": "contains", "value": "AI"}
]

Example query: "Companies with more than 50 employees founded after 2020"
Example response:
[
  {"field": "employeeCount", "operator": "greater_than", "value": "50"},
  {"field": "foundedYear", "operator": "greater_than", "value": "2020"}
]

Respond ONLY with the JSON array, no explanation or markdown.`

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      prompt: query,
      maxTokens: 1000,
    })

    console.log("[Filter AI] Raw response:", text)

    // Parse the JSON response
    let conditions: FilterCondition[]
    try {
      // Clean the response in case it has markdown code blocks
      let cleanedText = text.trim()
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7)
      }
      if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3)
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3)
      }
      cleanedText = cleanedText.trim()

      const parsed = JSON.parse(cleanedText)

      // Validate fields and operators
      const validFields = AVAILABLE_FIELDS.map((f) => f.field)
      const validOperators = AVAILABLE_OPERATORS.map((o) => o.operator)

      // Validate and transform to our format - only include items with valid fields/operators
      conditions = parsed
        .filter((c: unknown): c is { field: string; operator: string; value: unknown; value2?: unknown } =>
          typeof c === "object" &&
          c !== null &&
          "field" in c &&
          "operator" in c &&
          "value" in c &&
          typeof (c as { field: unknown }).field === "string" &&
          typeof (c as { operator: unknown }).operator === "string" &&
          validFields.includes((c as { field: string }).field) &&
          validOperators.includes((c as { operator: string }).operator)
        )
        .map((c, index: number) => ({
          id: `ai-${index}`,
          field: c.field as FilterField,
          operator: c.operator as FilterOperator,
          value: String(c.value),
          value2: c.value2 ? String(c.value2) : undefined,
        }))

      if (conditions.length === 0) {
        return NextResponse.json(
          { error: "Could not parse query into valid filters" },
          { status: 400 }
        )
      }
    } catch (parseError) {
      console.error("[Filter AI] Parse error:", parseError)
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      )
    }

    console.log("[Filter AI] Parsed conditions:", conditions)

    return NextResponse.json({ conditions }, { status: 200 })
  } catch (error) {
    console.error("[Filter AI] Error:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to process query: ${errorMessage}` },
      { status: 500 }
    )
  }
}
