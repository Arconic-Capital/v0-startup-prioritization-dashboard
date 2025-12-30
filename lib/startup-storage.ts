import type { Startup } from "./types"

// API-based storage functions (replaces localStorage)

export async function getAllStartups(options?: {
  page?: number
  limit?: number
  sector?: string
  pipelineStage?: string
  search?: string
  minScore?: number
  maxScore?: number
  signal?: AbortSignal
}): Promise<{ startups: Startup[]; pagination?: any }> {
  try {
    const params = new URLSearchParams()

    if (options?.page) params.set("page", options.page.toString())
    if (options?.limit) params.set("limit", options.limit.toString())
    if (options?.sector) params.set("sector", options.sector)
    if (options?.pipelineStage) params.set("pipelineStage", options.pipelineStage)
    if (options?.search) params.set("search", options.search)
    if (options?.minScore !== undefined) params.set("minScore", options.minScore.toString())
    if (options?.maxScore !== undefined) params.set("maxScore", options.maxScore.toString())

    const response = await fetch(`/api/startups?${params.toString()}`, {
      signal: options?.signal,
    })

    if (!response.ok) {
      throw new Error("Failed to fetch startups")
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[Storage] Error fetching startups:", error)
    return { startups: [] }
  }
}

export async function getStartupById(id: string): Promise<Startup | undefined> {
  try {
    const response = await fetch(`/api/startups/${id}`)

    if (!response.ok) {
      if (response.status === 404) {
        return undefined
      }
      throw new Error("Failed to fetch startup")
    }

    return await response.json()
  } catch (error) {
    console.error("[Storage] Error fetching startup:", error)
    return undefined
  }
}

export async function addUploadedStartup(startup: Startup): Promise<Startup | null> {
  try {
    const response = await fetch("/api/startups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(startup),
    })

    if (!response.ok) {
      throw new Error("Failed to create startup")
    }

    return await response.json()
  } catch (error) {
    console.error("[Storage] Error creating startup:", error)
    return null
  }
}

export async function addUploadedStartups(startups: Startup[]): Promise<number> {
  try {
    const response = await fetch("/api/startups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(startups),
    })

    if (!response.ok) {
      throw new Error("Failed to create startups")
    }

    const data = await response.json()
    return data.count || 0
  } catch (error) {
    console.error("[Storage] Error creating startups:", error)
    return 0
  }
}

export async function updateStartup(id: string, data: Partial<Startup>): Promise<Startup | null> {
  try {
    const response = await fetch(`/api/startups/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Failed to update startup")
    }

    return await response.json()
  } catch (error) {
    console.error("[Storage] Error updating startup:", error)
    return null
  }
}

// Legacy functions for backward compatibility (deprecated)
export function saveUploadedStartups(_startups: Startup[]) {
  console.warn("[Storage] saveUploadedStartups is deprecated. Data is now stored in the database.")
}

export function getUploadedStartups(): Startup[] {
  console.warn("[Storage] getUploadedStartups is deprecated. Use getAllStartups() instead.")
  return []
}
