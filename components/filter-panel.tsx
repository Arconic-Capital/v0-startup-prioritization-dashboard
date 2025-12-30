"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Plus, Trash2, Sparkles, X, Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { FilterCondition } from "@/components/filter-condition"
import {
  SavedFilter,
  FilterCondition as FilterConditionType,
  getSavedFilters,
  saveFilters,
  createFilter,
  updateFilter,
  deleteFilter,
  createCondition,
} from "@/lib/filter-store"

interface FilterPanelProps {
  activeFilterIds: string[]
  onActiveFiltersChange: (filterIds: string[]) => void
  onAskAI: (query: string) => Promise<FilterConditionType[]>
}

export function FilterPanel({
  activeFilterIds,
  onActiveFiltersChange,
  onAskAI,
}: FilterPanelProps) {
  const [filters, setFilters] = useState<SavedFilter[]>([])
  const [expandedFilterId, setExpandedFilterId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newFilterName, setNewFilterName] = useState("")
  const [newFilterConditions, setNewFilterConditions] = useState<FilterConditionType[]>([createCondition()])
  const [newFilterMatchMode, setNewFilterMatchMode] = useState<"AND" | "OR">("AND")

  // AI filter state
  const [aiQuery, setAiQuery] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<{ conditions: FilterConditionType[]; count?: number } | null>(null)
  const [aiFilterName, setAiFilterName] = useState("")
  const [aiEditMode, setAiEditMode] = useState(false)
  const [aiMatchMode, setAiMatchMode] = useState<"AND" | "OR">("OR")

  // Load filters from localStorage on mount
  useEffect(() => {
    setFilters(getSavedFilters())
  }, [])

  // Save filters to localStorage when they change
  useEffect(() => {
    if (filters.length > 0) {
      saveFilters(filters)
    }
  }, [filters])

  const toggleFilterActive = (filterId: string) => {
    if (activeFilterIds.includes(filterId)) {
      onActiveFiltersChange(activeFilterIds.filter((id) => id !== filterId))
    } else {
      onActiveFiltersChange([...activeFilterIds, filterId])
    }
  }

  const toggleFilterExpanded = (filterId: string) => {
    setExpandedFilterId(expandedFilterId === filterId ? null : filterId)
    setIsCreatingNew(false)
  }

  const handleUpdateFilter = (filterId: string, updates: Partial<SavedFilter>) => {
    setFilters(updateFilter(filters, filterId, updates))
  }

  const handleDeleteFilter = (filterId: string) => {
    setFilters(deleteFilter(filters, filterId))
    onActiveFiltersChange(activeFilterIds.filter((id) => id !== filterId))
    if (expandedFilterId === filterId) {
      setExpandedFilterId(null)
    }
  }

  const handleStartCreateNew = () => {
    setIsCreatingNew(true)
    setExpandedFilterId(null)
    setNewFilterName("")
    setNewFilterConditions([createCondition()])
    setNewFilterMatchMode("AND")
  }

  const handleCancelCreate = () => {
    setIsCreatingNew(false)
    setNewFilterName("")
    setNewFilterConditions([createCondition()])
    setNewFilterMatchMode("AND")
  }

  const handleSaveNewFilter = () => {
    if (!newFilterName.trim()) return
    if (newFilterConditions.every((c) => !c.value && !["is_empty", "is_not_empty"].includes(c.operator))) return

    const validConditions = newFilterConditions.filter(
      (c) => c.value || ["is_empty", "is_not_empty"].includes(c.operator)
    )

    // Ensure we have at least one valid condition before creating
    if (validConditions.length === 0) return

    const newFilter = createFilter(newFilterName.trim(), validConditions, newFilterMatchMode)
    setFilters([...filters, newFilter])
    setIsCreatingNew(false)
    setNewFilterName("")
    setNewFilterConditions([createCondition()])
    setNewFilterMatchMode("AND")

    // Auto-activate the new filter
    onActiveFiltersChange([...activeFilterIds, newFilter.id])
  }

  const handleAddConditionToNew = () => {
    setNewFilterConditions([...newFilterConditions, createCondition()])
  }

  const handleUpdateConditionInNew = (index: number, condition: FilterConditionType) => {
    const updated = [...newFilterConditions]
    updated[index] = condition
    setNewFilterConditions(updated)
  }

  const handleRemoveConditionFromNew = (index: number) => {
    if (newFilterConditions.length > 1) {
      setNewFilterConditions(newFilterConditions.filter((_, i) => i !== index))
    }
  }

  const handleAddConditionToExisting = (filterId: string) => {
    const filter = filters.find((f) => f.id === filterId)
    if (filter) {
      handleUpdateFilter(filterId, {
        conditions: [...filter.conditions, createCondition()],
      })
    }
  }

  const handleUpdateConditionInExisting = (filterId: string, conditionId: string, updates: Partial<FilterConditionType>) => {
    const filter = filters.find((f) => f.id === filterId)
    if (filter) {
      handleUpdateFilter(filterId, {
        conditions: filter.conditions.map((c) =>
          c.id === conditionId ? { ...c, ...updates } : c
        ),
      })
    }
  }

  const handleRemoveConditionFromExisting = (filterId: string, conditionId: string) => {
    const filter = filters.find((f) => f.id === filterId)
    if (filter && filter.conditions.length > 1) {
      handleUpdateFilter(filterId, {
        conditions: filter.conditions.filter((c) => c.id !== conditionId),
      })
    }
  }

  const handleAskAI = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true)
    setAiResult(null)
    setAiEditMode(false)
    try {
      const conditions = await onAskAI(aiQuery)
      setAiResult({ conditions })
      // Set default name from query
      const defaultName = aiQuery.length > 30 ? aiQuery.slice(0, 30) + "..." : aiQuery
      setAiFilterName(defaultName)
    } catch (error) {
      console.error("AI filter error:", error)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSaveAIFilter = () => {
    if (!aiResult || !aiFilterName.trim()) return
    const newFilter = createFilter(aiFilterName.trim(), aiResult.conditions, aiMatchMode)
    setFilters([...filters, newFilter])
    onActiveFiltersChange([...activeFilterIds, newFilter.id])
    setAiQuery("")
    setAiResult(null)
    setAiFilterName("")
    setAiEditMode(false)
    setAiMatchMode("OR")
  }

  const handleApplyAIFilter = () => {
    if (!aiResult) return
    // Create a temporary filter and apply it
    const name = aiFilterName.trim() || "AI Filter"
    const tempFilter = createFilter(name, aiResult.conditions, aiMatchMode)
    setFilters([...filters, tempFilter])
    onActiveFiltersChange([...activeFilterIds, tempFilter.id])
    setAiQuery("")
    setAiResult(null)
    setAiFilterName("")
    setAiEditMode(false)
    setAiMatchMode("OR")
  }

  const handleClearAIResult = () => {
    setAiResult(null)
    setAiFilterName("")
    setAiEditMode(false)
    setAiMatchMode("OR")
  }

  const handleUpdateAICondition = (index: number, updates: Partial<FilterConditionType>) => {
    if (!aiResult) return
    const updatedConditions = aiResult.conditions.map((c, i) =>
      i === index ? { ...c, ...updates } : c
    )
    setAiResult({ ...aiResult, conditions: updatedConditions })
  }

  const handleRemoveAICondition = (index: number) => {
    if (!aiResult || aiResult.conditions.length <= 1) return
    const updatedConditions = aiResult.conditions.filter((_, i) => i !== index)
    setAiResult({ ...aiResult, conditions: updatedConditions })
  }

  const handleAddAICondition = () => {
    if (!aiResult) return
    setAiResult({
      ...aiResult,
      conditions: [...aiResult.conditions, createCondition()],
    })
  }

  const clearAllFilters = () => {
    onActiveFiltersChange([])
  }

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm">Filters</h2>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3 space-y-2">
          {/* Filter List */}
          {filters.map((filter) => (
            <div key={filter.id} className="rounded-md border border-border overflow-hidden">
              {/* Filter Header - Always Visible */}
              <div
                className={`flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                  activeFilterIds.includes(filter.id) ? "bg-primary/10" : ""
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={activeFilterIds.includes(filter.id)}
                  onChange={() => toggleFilterActive(filter.id)}
                  className="h-4 w-4 rounded border-gray-300"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Filter Name */}
                <span
                  className="flex-1 text-sm font-medium truncate"
                  onClick={() => toggleFilterExpanded(filter.id)}
                >
                  {filter.name}
                </span>

                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleFilterExpanded(filter.id)}
                >
                  {expandedFilterId === filter.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Expanded Filter Content */}
              {expandedFilterId === filter.id && (
                <div className="p-3 pt-2 space-y-3 bg-muted/20">
                  {/* Editable Filter Name */}
                  <Input
                    value={filter.name}
                    onChange={(e) => handleUpdateFilter(filter.id, { name: e.target.value })}
                    className="h-8 text-sm font-medium"
                    placeholder="Filter name..."
                  />

                  {/* Conditions */}
                  {filter.conditions.map((condition, index) => (
                    <FilterCondition
                      key={condition.id}
                      condition={condition}
                      onChange={(updated) =>
                        handleUpdateConditionInExisting(filter.id, condition.id, updated)
                      }
                      onRemove={() => handleRemoveConditionFromExisting(filter.id, condition.id)}
                      showRemove={filter.conditions.length > 1}
                    />
                  ))}

                  {/* Add Condition */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => handleAddConditionToExisting(filter.id)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add condition
                  </Button>

                  {/* Match Mode */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">Match:</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`match-${filter.id}`}
                        checked={filter.matchMode === "AND"}
                        onChange={() => handleUpdateFilter(filter.id, { matchMode: "AND" })}
                        className="h-3 w-3"
                      />
                      ALL
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`match-${filter.id}`}
                        checked={filter.matchMode === "OR"}
                        onChange={() => handleUpdateFilter(filter.id, { matchMode: "OR" })}
                        className="h-3 w-3"
                      />
                      ANY
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => toggleFilterActive(filter.id)}
                    >
                      {activeFilterIds.includes(filter.id) ? "Remove" : "Apply"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDeleteFilter(filter.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* New Filter Form */}
          {isCreatingNew && (
            <div className="rounded-md border border-primary bg-primary/5 p-3 space-y-3">
              {/* Filter Name Input */}
              <Input
                placeholder="Filter name..."
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />

              {/* Conditions */}
              {newFilterConditions.map((condition, index) => (
                <FilterCondition
                  key={condition.id}
                  condition={condition}
                  onChange={(updated) => handleUpdateConditionInNew(index, updated)}
                  onRemove={() => handleRemoveConditionFromNew(index)}
                  showRemove={newFilterConditions.length > 1}
                />
              ))}

              {/* Add Condition */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={handleAddConditionToNew}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add condition
              </Button>

              {/* Match Mode */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted-foreground">Match:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="new-match"
                    checked={newFilterMatchMode === "AND"}
                    onChange={() => setNewFilterMatchMode("AND")}
                    className="h-3 w-3"
                  />
                  ALL
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="new-match"
                    checked={newFilterMatchMode === "OR"}
                    onChange={() => setNewFilterMatchMode("OR")}
                    className="h-3 w-3"
                  />
                  ANY
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleCancelCreate}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleSaveNewFilter}
                  disabled={!newFilterName.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* New Filter Button */}
          {!isCreatingNew && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleStartCreateNew}
            >
              <Plus className="h-3 w-3 mr-1" />
              New Filter
            </Button>
          )}
        </div>

        <Separator className="my-2" />

        {/* Ask AI Section */}
        <div className="p-3 pb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Ask AI
          </div>

          <div className="space-y-2">
            <textarea
              placeholder='e.g. "B2B healthcare startups with AI in their product"'
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="w-full h-20 text-xs p-2 rounded-md border border-border bg-background resize-none"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleAskAI}
              disabled={aiLoading || !aiQuery.trim()}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Thinking...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>

          {/* AI Result */}
          {aiResult && (
            <div className="rounded-md border border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-800 p-3 space-y-3">
              {/* Header with dismiss */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-purple-700 dark:text-purple-300">
                  AI Generated Filter
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={handleClearAIResult}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Filter Name Input */}
              <Input
                placeholder="Filter name..."
                value={aiFilterName}
                onChange={(e) => setAiFilterName(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-background"
              />

              {/* Conditions - Read-only or Editable */}
              {!aiEditMode ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Conditions:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setAiEditMode(true)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                  {aiResult.conditions.map((condition, index) => (
                    <div key={index} className="text-xs text-purple-600 dark:text-purple-400 pl-2">
                      • {condition.field} {condition.operator.replace(/_/g, " ")} "{condition.value}"
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Edit Conditions:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => setAiEditMode(false)}
                    >
                      Done
                    </Button>
                  </div>
                  {aiResult.conditions.map((condition, index) => (
                    <FilterCondition
                      key={condition.id}
                      condition={condition}
                      onChange={(updated) => handleUpdateAICondition(index, updated)}
                      onRemove={() => handleRemoveAICondition(index)}
                      showRemove={aiResult.conditions.length > 1}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={handleAddAICondition}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add condition
                  </Button>
                </div>
              )}

              {/* Match Mode Toggle */}
              <div className="flex items-center gap-3 text-xs py-1">
                <span className="text-muted-foreground">Match:</span>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="ai-match-mode"
                    checked={aiMatchMode === "AND"}
                    onChange={() => setAiMatchMode("AND")}
                    className="h-3 w-3"
                  />
                  ALL
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="ai-match-mode"
                    checked={aiMatchMode === "OR"}
                    onChange={() => setAiMatchMode("OR")}
                    className="h-3 w-3"
                  />
                  ANY
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={handleApplyAIFilter}
                >
                  Apply
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 h-8 text-xs bg-purple-600 hover:bg-purple-700"
                  onClick={handleSaveAIFilter}
                  disabled={!aiFilterName.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Footer */}
      {activeFilterIds.length > 0 && (
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Active: {activeFilterIds.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={clearAllFilters}
            >
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {activeFilterIds.map((id) => {
              const filter = filters.find((f) => f.id === id)
              if (!filter) return null
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                >
                  {filter.name}
                  <button
                    onClick={() => toggleFilterActive(id)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
