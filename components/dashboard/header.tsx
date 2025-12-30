"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Briefcase, Upload } from "lucide-react"

type ViewMode = "kanban" | "table" | "founders-kanban" | "founders-table"

interface HeaderProps {
  viewMode: ViewMode
  filteredCount: number
  totalCount: number
  showOnlyShortlisted: boolean
  limit: number
  onLimitChange: (limit: number) => void
  onSwitchToKanban: () => void
  onSwitchToTable: () => void
  onSwitchToFounders: () => void
  onSetViewMode: (mode: ViewMode) => void
  onShowUpload: () => void
}

export function DashboardHeader({
  viewMode,
  filteredCount,
  totalCount,
  showOnlyShortlisted,
  limit,
  onLimitChange,
  onSwitchToKanban,
  onSwitchToTable,
  onSwitchToFounders,
  onSetViewMode,
  onShowUpload,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-card shrink-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-end gap-4 mb-2">
              <Image src="/arconic-logo.png" alt="Arconic" width={140} height={35} className="h-9 w-auto" />
              <h1 className="text-3xl font-semibold text-foreground">Lighthouse AI</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">AI led workflow to prioritise startup research</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Showing </span>
                <span className="font-medium text-foreground">
                  {filteredCount}
                  {showOnlyShortlisted && ` shortlisted`} of {totalCount.toLocaleString()}
                </span>
                <span className="text-muted-foreground"> companies</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Display:</span>
                <select
                  value={limit}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                  className="text-sm border border-border rounded px-2 py-1 bg-background"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                  <option value={1000}>1,000</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-border rounded-md">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="sm"
                onClick={onSwitchToKanban}
                className="rounded-r-none"
              >
                Pipeline
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={onSwitchToTable}
                className="rounded-none border-x border-border"
              >
                Companies
              </Button>
              <Button
                variant={viewMode === "founders-kanban" || viewMode === "founders-table" ? "default" : "ghost"}
                size="sm"
                onClick={onSwitchToFounders}
                className="rounded-l-none"
              >
                Founders
              </Button>
            </div>
            {(viewMode === "founders-kanban" || viewMode === "founders-table") && (
              <div className="flex border border-border rounded-md">
                <Button
                  variant={viewMode === "founders-kanban" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onSetViewMode("founders-kanban")}
                  className="rounded-r-none"
                >
                  Board
                </Button>
                <Button
                  variant={viewMode === "founders-table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onSetViewMode("founders-table")}
                  className="rounded-l-none"
                >
                  Table
                </Button>
              </div>
            )}
            <Link href="/portfolio">
              <Button variant="outline">
                <Briefcase className="h-4 w-4 mr-2" />
                Portfolio
              </Button>
            </Link>
            {(viewMode === "founders-kanban" || viewMode === "founders-table") ? (
              <Link href="/founders/upload">
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Founders
                </Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={onShowUpload}>
                Upload CSV
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
