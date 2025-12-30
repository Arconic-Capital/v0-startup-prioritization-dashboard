"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import type { Startup } from "@/lib/types"

interface InvestmentForm {
  investmentDate: string
  investmentAmount: string
  ownership: string
  valuation: string
  investmentType: string
  leadInvestor: boolean
  boardSeat: boolean
}

interface PortfolioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  startup: Startup | null
  investmentForm: InvestmentForm
  onFormChange: (form: InvestmentForm) => void
  onSubmit: () => void
  onCancel: () => void
  isSubmitting: boolean
}

export function PortfolioDialog({
  open,
  onOpenChange,
  startup,
  investmentForm,
  onFormChange,
  onSubmit,
  onCancel,
  isSubmitting,
}: PortfolioDialogProps) {
  // Validation
  const investmentAmount = parseFloat(investmentForm.investmentAmount)
  const valuation = parseFloat(investmentForm.valuation)
  const ownership = parseFloat(investmentForm.ownership)

  const isAmountValid = !investmentForm.investmentAmount || (investmentAmount > 0)
  const isValuationValid = !investmentForm.valuation || (valuation > 0)
  const isOwnershipValid = !investmentForm.ownership || (ownership >= 0 && ownership <= 100)

  const hasRequiredFields = investmentForm.investmentDate && investmentForm.investmentAmount
  const isFormValid = hasRequiredFields && isAmountValid && isValuationValid && isOwnershipValid

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Portfolio</DialogTitle>
        </DialogHeader>
        {startup && (
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg">
              <p className="font-medium">{startup.name}</p>
              <p className="text-sm text-muted-foreground">{startup.sector}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investmentDate">Investment Date</Label>
                <Input
                  id="investmentDate"
                  type="date"
                  value={investmentForm.investmentDate}
                  onChange={(e) => onFormChange({ ...investmentForm, investmentDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investmentType">Investment Type</Label>
                <select
                  id="investmentType"
                  value={investmentForm.investmentType}
                  onChange={(e) => onFormChange({ ...investmentForm, investmentType: e.target.value })}
                  className="w-full h-10 border border-border rounded px-3 bg-background text-sm"
                >
                  <option value="Pre-Seed">Pre-Seed</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B">Series B</option>
                  <option value="Series C">Series C</option>
                  <option value="Bridge">Bridge</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="investmentAmount">Investment Amount ($) *</Label>
                <Input
                  id="investmentAmount"
                  type="number"
                  min="0"
                  placeholder="e.g., 500000"
                  value={investmentForm.investmentAmount}
                  onChange={(e) => onFormChange({ ...investmentForm, investmentAmount: e.target.value })}
                  className={!isAmountValid ? "border-red-500" : ""}
                />
                {!isAmountValid && <p className="text-xs text-red-500">Must be greater than 0</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="valuation">Valuation ($)</Label>
                <Input
                  id="valuation"
                  type="number"
                  min="0"
                  placeholder="e.g., 5000000"
                  value={investmentForm.valuation}
                  onChange={(e) => onFormChange({ ...investmentForm, valuation: e.target.value })}
                  className={!isValuationValid ? "border-red-500" : ""}
                />
                {!isValuationValid && <p className="text-xs text-red-500">Must be greater than 0</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownership">Ownership (%)</Label>
                <Input
                  id="ownership"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g., 10"
                  value={investmentForm.ownership}
                  onChange={(e) => onFormChange({ ...investmentForm, ownership: e.target.value })}
                  className={!isOwnershipValid ? "border-red-500" : ""}
                />
                {!isOwnershipValid && <p className="text-xs text-red-500">Must be between 0-100%</p>}
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={investmentForm.leadInvestor}
                  onChange={(e) => onFormChange({ ...investmentForm, leadInvestor: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Lead Investor</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={investmentForm.boardSeat}
                  onChange={(e) => onFormChange({ ...investmentForm, boardSeat: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Board Seat</span>
              </label>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? "Creating..." : "Add to Portfolio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
