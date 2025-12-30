// Scroll position and view mode persistence utilities
// Uses sessionStorage for per-session persistence

const SCROLL_KEY_PREFIX = "lighthouse_scroll_"
const VIEW_MODE_KEY = "lighthouse_viewMode"
const SCROLL_EXPIRY_MS = 30 * 60 * 1000 // 30 minutes

export type ViewMode = "kanban" | "table" | "founders-kanban" | "founders-table"

interface ScrollData {
  y: number
  timestamp: number
}

/**
 * Save current scroll position to sessionStorage
 */
export function saveScrollPosition(key: string): void {
  if (typeof window === "undefined") return

  const data: ScrollData = {
    y: window.scrollY,
    timestamp: Date.now(),
  }
  sessionStorage.setItem(`${SCROLL_KEY_PREFIX}${key}`, JSON.stringify(data))
}

/**
 * Get saved scroll position, returns null if expired or not found
 */
export function getScrollPosition(key: string): number | null {
  if (typeof window === "undefined") return null

  const stored = sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${key}`)
  if (!stored) return null

  try {
    const { y, timestamp } = JSON.parse(stored) as ScrollData

    // Expire after 30 minutes
    if (Date.now() - timestamp > SCROLL_EXPIRY_MS) {
      sessionStorage.removeItem(`${SCROLL_KEY_PREFIX}${key}`)
      return null
    }

    return y
  } catch {
    sessionStorage.removeItem(`${SCROLL_KEY_PREFIX}${key}`)
    return null
  }
}

/**
 * Restore scroll position with smooth timing after render
 */
export function restoreScrollPosition(key: string): void {
  const y = getScrollPosition(key)
  if (y === null) return

  // Use requestAnimationFrame for smooth restoration after render
  requestAnimationFrame(() => {
    window.scrollTo({ top: y, behavior: "instant" })
  })

  // Clear after restoration
  sessionStorage.removeItem(`${SCROLL_KEY_PREFIX}${key}`)
}

/**
 * Save current view mode to sessionStorage
 */
export function saveViewMode(mode: ViewMode): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(VIEW_MODE_KEY, mode)
}

/**
 * Get saved view mode, returns null if not found
 */
export function getViewMode(): ViewMode | null {
  if (typeof window === "undefined") return null

  const mode = sessionStorage.getItem(VIEW_MODE_KEY)
  if (mode && ["kanban", "table", "founders-kanban", "founders-table"].includes(mode)) {
    return mode as ViewMode
  }
  return null
}

/**
 * Clear saved view mode
 */
export function clearViewMode(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(VIEW_MODE_KEY)
}
