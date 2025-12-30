"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { getViewMode } from "@/lib/scroll-restoration"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  returnTo: "dashboard" | "portfolio" | "founders"
  label?: string
  className?: string
}

const defaultLabels: Record<BackButtonProps["returnTo"], string> = {
  dashboard: "Back to Pipeline",
  portfolio: "Back to Portfolio",
  founders: "Back to Founders",
}

export function BackButton({ returnTo, label, className }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    const viewMode = getViewMode()

    switch (returnTo) {
      case "dashboard":
        // Use saved view mode or default to kanban
        const params = viewMode ? `?view=${viewMode}` : ""
        router.push(`/${params}`)
        break
      case "portfolio":
        router.push("/portfolio")
        break
      case "founders":
        router.push("/?view=founders-table")
        break
    }
  }

  const buttonLabel = label || defaultLabels[returnTo]

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={cn("gap-2", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      {buttonLabel}
    </Button>
  )
}
