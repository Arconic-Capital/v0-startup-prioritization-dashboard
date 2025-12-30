"use client"

import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FilterCondition as FilterConditionType,
  FilterField,
  FilterOperator,
  FILTER_FIELDS,
  TEXT_OPERATORS,
  NUMBER_OPERATORS,
} from "@/lib/filter-store"

interface FilterConditionProps {
  condition: FilterConditionType
  onChange: (condition: FilterConditionType) => void
  onRemove: () => void
  showRemove: boolean
}

export function FilterCondition({
  condition,
  onChange,
  onRemove,
  showRemove,
}: FilterConditionProps) {
  const fieldMeta = FILTER_FIELDS.find((f) => f.value === condition.field)
  const isNumberField = fieldMeta?.type === "number"
  const operators = isNumberField ? NUMBER_OPERATORS : TEXT_OPERATORS
  const needsValue = !["is_empty", "is_not_empty"].includes(condition.operator)
  const needsSecondValue = condition.operator === "between"

  const handleFieldChange = (field: FilterField) => {
    const newFieldMeta = FILTER_FIELDS.find((f) => f.value === field)
    const newIsNumber = newFieldMeta?.type === "number"
    const currentIsNumber = isNumberField

    // Reset operator if switching between text and number fields
    let newOperator = condition.operator
    if (newIsNumber !== currentIsNumber) {
      newOperator = newIsNumber ? "equals" : "contains"
    }

    onChange({
      ...condition,
      field,
      operator: newOperator,
    })
  }

  const handleOperatorChange = (operator: FilterOperator) => {
    onChange({
      ...condition,
      operator,
      value2: operator === "between" ? condition.value2 || "" : undefined,
    })
  }

  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-md border border-border/50">
      {/* Header with remove button */}
      {showRemove && (
        <div className="flex justify-end -mt-1 -mr-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Field Select */}
      <Select value={condition.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue placeholder="Select field..." />
        </SelectTrigger>
        <SelectContent>
          {FILTER_FIELDS.map((field) => (
            <SelectItem key={field.value} value={field.value} className="text-xs">
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Select */}
      <Select value={condition.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue placeholder="Select operator..." />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value} className="text-xs">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input(s) */}
      {needsValue && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              type={isNumberField ? "number" : "text"}
              placeholder={needsSecondValue ? "Min value..." : "Enter value..."}
              value={condition.value}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              className="h-8 text-xs"
            />
            {needsSecondValue && (
              <Input
                type="number"
                placeholder="Max value..."
                value={condition.value2 || ""}
                onChange={(e) => onChange({ ...condition, value2: e.target.value })}
                className="h-8 text-xs"
              />
            )}
          </div>
          {/* Validation warning for "between" operator when second value is missing */}
          {needsSecondValue && condition.value && !condition.value2 && (
            <p className="text-xs text-amber-600">Max value required for range filter</p>
          )}
        </div>
      )}
    </div>
  )
}
