"use client"

import { useState, useEffect, useCallback, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Target,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Flag,
  MessageSquare,
  FileText,
  BarChart3,
  Phone,
  Mail,
  Video,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { BackButton } from "@/components/back-button"
import type {
  PortfolioInvestment,
  FollowOnInvestment,
  PortfolioMilestone,
  PortfolioUpdate,
  BoardMeeting,
  FounderCommunication,
  KPISnapshot,
} from "@/lib/types"

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

function formatMOIC(moic: number | null | undefined): string {
  if (moic === null || moic === undefined) return "—"
  return `${moic.toFixed(2)}x`
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${value.toFixed(1)}%`
}

interface InvestmentWithExtras extends PortfolioInvestment {
  totalInvested: number
  currentValue: number | null
  moic: number | null
  unrealizedGain: number | null
  startup?: {
    id: string
    name: string
    sector: string
    country: string
    description?: string
    companyInfo?: Record<string, unknown>
  }
}

export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [investment, setInvestment] = useState<InvestmentWithExtras | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isMilestoneDialogOpen, setIsMilestoneDialogOpen] = useState(false)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isKPIDialogOpen, setIsKPIDialogOpen] = useState(false)
  const [isCommDialogOpen, setIsCommDialogOpen] = useState(false)
  const [isFollowOnDialogOpen, setIsFollowOnDialogOpen] = useState(false)
  const [isBoardMeetingDialogOpen, setIsBoardMeetingDialogOpen] = useState(false)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [milestoneForm, setMilestoneForm] = useState({
    date: new Date().toISOString().split("T")[0],
    title: "",
    category: "product",
    description: "",
    impact: "positive",
  })

  const [updateForm, setUpdateForm] = useState({
    date: new Date().toISOString().split("T")[0],
    period: "",
    highlights: "",
    challenges: "",
    askFromInvestors: "",
    nextMilestones: "",
    overallHealth: "green",
  })

  const [kpiForm, setKPIForm] = useState({
    date: new Date().toISOString().split("T")[0],
    mrr: "",
    arr: "",
    customers: "",
    employees: "",
    runway: "",
    netBurn: "",
  })

  const [commForm, setCommForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "call",
    subject: "",
    summary: "",
    followUpRequired: false,
  })

  const [followOnForm, setFollowOnForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    round: "",
    postMoneyValuation: "",
    leadInvestor: false,
  })

  const [exitForm, setExitForm] = useState({
    exitDate: new Date().toISOString().split("T")[0],
    exitType: "acquisition",
    exitAmount: "",
    acquirer: "",
  })

  const fetchInvestment = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/portfolio/${id}`)
      if (res.ok) {
        const data = await res.json()
        setInvestment(data.investment)
      } else if (res.status === 404) {
        router.push("/portfolio")
      }
    } catch (error) {
      console.error("Failed to fetch investment:", error)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    fetchInvestment()
  }, [fetchInvestment])

  // Handler functions
  const handleAddMilestone = async () => {
    if (!milestoneForm.title) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/portfolio/${id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(milestoneForm),
      })
      if (res.ok) {
        setIsMilestoneDialogOpen(false)
        setMilestoneForm({
          date: new Date().toISOString().split("T")[0],
          title: "",
          category: "product",
          description: "",
          impact: "positive",
        })
        fetchInvestment()
      }
    } catch (error) {
      console.error("Error adding milestone:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddUpdate = async () => {
    if (!updateForm.period) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/portfolio/${id}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateForm),
      })
      if (res.ok) {
        setIsUpdateDialogOpen(false)
        setUpdateForm({
          date: new Date().toISOString().split("T")[0],
          period: "",
          highlights: "",
          challenges: "",
          askFromInvestors: "",
          nextMilestones: "",
          overallHealth: "green",
        })
        fetchInvestment()
      }
    } catch (error) {
      console.error("Error adding update:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddKPI = async () => {
    setIsSubmitting(true)
    try {
      const payload: Record<string, unknown> = { date: kpiForm.date }
      if (kpiForm.mrr) payload.mrr = parseFloat(kpiForm.mrr)
      if (kpiForm.arr) payload.arr = parseFloat(kpiForm.arr)
      if (kpiForm.customers) payload.customers = parseInt(kpiForm.customers)
      if (kpiForm.employees) payload.employees = parseInt(kpiForm.employees)
      if (kpiForm.runway) payload.runway = parseFloat(kpiForm.runway)
      if (kpiForm.netBurn) payload.netBurn = parseFloat(kpiForm.netBurn)

      const res = await fetch(`/api/portfolio/${id}/kpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setIsKPIDialogOpen(false)
        setKPIForm({
          date: new Date().toISOString().split("T")[0],
          mrr: "",
          arr: "",
          customers: "",
          employees: "",
          runway: "",
          netBurn: "",
        })
        fetchInvestment()
      }
    } catch (error) {
      console.error("Error adding KPI:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddCommunication = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/portfolio/${id}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commForm),
      })
      if (res.ok) {
        setIsCommDialogOpen(false)
        setCommForm({
          date: new Date().toISOString().split("T")[0],
          type: "call",
          subject: "",
          summary: "",
          followUpRequired: false,
        })
        fetchInvestment()
      }
    } catch (error) {
      console.error("Error adding communication:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddFollowOn = async () => {
    if (!followOnForm.amount) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/portfolio/${id}/follow-ons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...followOnForm,
          amount: parseFloat(followOnForm.amount),
          postMoneyValuation: followOnForm.postMoneyValuation
            ? parseFloat(followOnForm.postMoneyValuation)
            : undefined,
        }),
      })
      if (res.ok) {
        setIsFollowOnDialogOpen(false)
        setFollowOnForm({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          round: "",
          postMoneyValuation: "",
          leadInvestor: false,
        })
        fetchInvestment()
      }
    } catch (error) {
      console.error("Error adding follow-on:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecordExit = async () => {
    if (!exitForm.exitAmount) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "exited",
          exitDate: exitForm.exitDate,
          exitType: exitForm.exitType,
          exitAmount: parseFloat(exitForm.exitAmount),
          acquirer: exitForm.acquirer || undefined,
        }),
      })
      if (res.ok) {
        setIsExitDialogOpen(false)
        fetchInvestment()
      }
    } catch (error) {
      console.error("Error recording exit:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getHealthBadge = (health: string | undefined) => {
    switch (health) {
      case "green":
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>
      case "yellow":
        return <Badge className="bg-yellow-100 text-yellow-800">Needs Attention</Badge>
      case "red":
        return <Badge className="bg-red-100 text-red-800">At Risk</Badge>
      default:
        return null
    }
  }

  const getCommIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "meeting":
        return <Video className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!investment) {
    return (
      <div className="container mx-auto py-6">
        <p>Investment not found</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <BackButton returnTo="portfolio" />
          <Breadcrumb
            items={[
              { label: "Portfolio", href: "/portfolio" },
              { label: investment.startup?.name || "Company" },
            ]}
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">
                {investment.startup?.name || "Unknown Company"}
              </h1>
              <Badge
                className={
                  investment.status === "active"
                    ? "bg-green-100 text-green-800"
                    : investment.status === "exited"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {investment.status}
              </Badge>
              {investment.leadInvestor && (
                <Badge variant="outline">Lead Investor</Badge>
              )}
              {investment.boardSeat && <Badge variant="outline">Board Seat</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">
              {investment.startup?.sector} • {investment.startup?.country}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {investment.status === "active" && (
            <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Record Exit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Exit</DialogTitle>
                  <DialogDescription>
                    Record the exit details for this investment
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Exit Date</Label>
                      <Input
                        type="date"
                        value={exitForm.exitDate}
                        onChange={(e) =>
                          setExitForm({ ...exitForm, exitDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Exit Type</Label>
                      <Select
                        value={exitForm.exitType}
                        onValueChange={(value) =>
                          setExitForm({ ...exitForm, exitType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="acquisition">Acquisition</SelectItem>
                          <SelectItem value="IPO">IPO</SelectItem>
                          <SelectItem value="secondary">Secondary Sale</SelectItem>
                          <SelectItem value="buyback">Buyback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Exit Amount ($)</Label>
                    <Input
                      type="number"
                      placeholder="Total proceeds"
                      value={exitForm.exitAmount}
                      onChange={(e) =>
                        setExitForm({ ...exitForm, exitAmount: e.target.value })
                      }
                    />
                  </div>
                  {exitForm.exitType === "acquisition" && (
                    <div className="space-y-2">
                      <Label>Acquirer</Label>
                      <Input
                        placeholder="Company name"
                        value={exitForm.acquirer}
                        onChange={(e) =>
                          setExitForm({ ...exitForm, acquirer: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsExitDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleRecordExit} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Record Exit"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Link href={`/company/${investment.startupId}`}>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Company
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(investment.totalInvested)}
            </div>
            <p className="text-xs text-muted-foreground">
              {investment.investmentRound} • {formatDate(investment.investmentDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {investment.status === "exited"
                ? formatCurrency(investment.exitAmount)
                : formatCurrency(investment.currentValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {investment.status === "exited"
                ? `Exited via ${investment.exitType}`
                : `At ${formatCurrency(investment.currentValuation)} valuation`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MOIC</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (investment.moic || 0) >= 1 ? "text-green-600" : "text-red-600"
              }`}
            >
              {investment.status === "exited"
                ? formatMOIC(investment.exitMultiple)
                : formatMOIC(investment.moic)}
            </div>
            <p className="text-xs text-muted-foreground">
              {investment.unrealizedGain !== null && investment.unrealizedGain >= 0
                ? `+${formatCurrency(investment.unrealizedGain)} gain`
                : investment.unrealizedGain !== null
                ? `${formatCurrency(investment.unrealizedGain)} loss`
                : "—"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ownership</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(investment.currentEquityPct)}
            </div>
            <p className="text-xs text-muted-foreground">
              Entry: {formatPercent(investment.equityPercentage)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Follow-ons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {investment.followOnInvestments?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(
                investment.followOnInvestments?.reduce((sum, fo) => sum + fo.amount, 0) || 0
              )}{" "}
              additional
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="board">Board Meetings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Investment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Investment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Type</span>
                  <span className="font-medium capitalize">
                    {investment.investmentType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pre-Money Valuation</span>
                  <span className="font-medium">
                    {formatCurrency(investment.preMoneyValuation)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Post-Money Valuation</span>
                  <span className="font-medium">
                    {formatCurrency(investment.postMoneyValuation)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pro-rata Rights</span>
                  <span className="font-medium">
                    {investment.proRataRights ? "Yes" : "No"}
                  </span>
                </div>
                {investment.proRataAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pro-rata Amount</span>
                    <span className="font-medium">
                      {formatCurrency(investment.proRataAmount)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Follow-on Investments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Follow-on Investments</CardTitle>
                <Dialog
                  open={isFollowOnDialogOpen}
                  onOpenChange={setIsFollowOnDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Follow-on Investment</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={followOnForm.date}
                            onChange={(e) =>
                              setFollowOnForm({ ...followOnForm, date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Round</Label>
                          <Input
                            placeholder="Series B"
                            value={followOnForm.round}
                            onChange={(e) =>
                              setFollowOnForm({ ...followOnForm, round: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount ($)</Label>
                          <Input
                            type="number"
                            placeholder="500000"
                            value={followOnForm.amount}
                            onChange={(e) =>
                              setFollowOnForm({ ...followOnForm, amount: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Post-Money Valuation ($)</Label>
                          <Input
                            type="number"
                            placeholder="50000000"
                            value={followOnForm.postMoneyValuation}
                            onChange={(e) =>
                              setFollowOnForm({
                                ...followOnForm,
                                postMoneyValuation: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={followOnForm.leadInvestor}
                          onChange={(e) =>
                            setFollowOnForm({
                              ...followOnForm,
                              leadInvestor: e.target.checked,
                            })
                          }
                        />
                        Lead Investor
                      </label>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddFollowOn} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Add Follow-on"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!investment.followOnInvestments?.length ? (
                  <p className="text-muted-foreground text-sm">
                    No follow-on investments yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {investment.followOnInvestments.map((fo) => (
                      <div
                        key={fo.id}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div>
                          <div className="font-medium">{fo.round || "Follow-on"}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(fo.date)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(fo.amount)}</div>
                          {fo.postMoneyValuation && (
                            <div className="text-sm text-muted-foreground">
                              @ {formatCurrency(fo.postMoneyValuation)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Investment Thesis */}
          {investment.investmentThesis && (
            <Card>
              <CardHeader>
                <CardTitle>Investment Thesis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{investment.investmentThesis}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">KPI History</h3>
            <Dialog open={isKPIDialogOpen} onOpenChange={setIsKPIDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add KPI Snapshot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add KPI Snapshot</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={kpiForm.date}
                      onChange={(e) =>
                        setKPIForm({ ...kpiForm, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>MRR ($)</Label>
                      <Input
                        type="number"
                        placeholder="100000"
                        value={kpiForm.mrr}
                        onChange={(e) =>
                          setKPIForm({ ...kpiForm, mrr: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ARR ($)</Label>
                      <Input
                        type="number"
                        placeholder="1200000"
                        value={kpiForm.arr}
                        onChange={(e) =>
                          setKPIForm({ ...kpiForm, arr: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customers</Label>
                      <Input
                        type="number"
                        placeholder="50"
                        value={kpiForm.customers}
                        onChange={(e) =>
                          setKPIForm({ ...kpiForm, customers: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Employees</Label>
                      <Input
                        type="number"
                        placeholder="25"
                        value={kpiForm.employees}
                        onChange={(e) =>
                          setKPIForm({ ...kpiForm, employees: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Runway (months)</Label>
                      <Input
                        type="number"
                        placeholder="18"
                        value={kpiForm.runway}
                        onChange={(e) =>
                          setKPIForm({ ...kpiForm, runway: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Net Burn ($)</Label>
                      <Input
                        type="number"
                        placeholder="150000"
                        value={kpiForm.netBurn}
                        onChange={(e) =>
                          setKPIForm({ ...kpiForm, netBurn: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddKPI} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Snapshot"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!investment.kpiSnapshots?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No KPI data yet</h3>
                <p className="text-muted-foreground">
                  Add KPI snapshots to track performance over time
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-right">ARR</TableHead>
                    <TableHead className="text-right">Customers</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Runway</TableHead>
                    <TableHead className="text-right">Burn</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investment.kpiSnapshots.map((kpi) => (
                    <TableRow key={kpi.id}>
                      <TableCell>{formatDate(kpi.date)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(kpi.mrr)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(kpi.arr)}
                      </TableCell>
                      <TableCell className="text-right">
                        {kpi.customers || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {kpi.employees || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {kpi.runway ? `${kpi.runway}mo` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(kpi.netBurn)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Founder Updates</h3>
            <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Update
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Founder Update</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={updateForm.date}
                        onChange={(e) =>
                          setUpdateForm({ ...updateForm, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period</Label>
                      <Input
                        placeholder="Q4 2024"
                        value={updateForm.period}
                        onChange={(e) =>
                          setUpdateForm({ ...updateForm, period: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Health Status</Label>
                      <Select
                        value={updateForm.overallHealth}
                        onValueChange={(value) =>
                          setUpdateForm({ ...updateForm, overallHealth: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="green">Healthy</SelectItem>
                          <SelectItem value="yellow">Needs Attention</SelectItem>
                          <SelectItem value="red">At Risk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Highlights</Label>
                    <Textarea
                      placeholder="Key wins and achievements..."
                      value={updateForm.highlights}
                      onChange={(e) =>
                        setUpdateForm({ ...updateForm, highlights: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Challenges</Label>
                    <Textarea
                      placeholder="Current challenges..."
                      value={updateForm.challenges}
                      onChange={(e) =>
                        setUpdateForm({ ...updateForm, challenges: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ask from Investors</Label>
                    <Textarea
                      placeholder="How can investors help..."
                      value={updateForm.askFromInvestors}
                      onChange={(e) =>
                        setUpdateForm({
                          ...updateForm,
                          askFromInvestors: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddUpdate} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Update"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!investment.updates?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No updates yet</h3>
                <p className="text-muted-foreground">
                  Add founder updates to track company progress
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {investment.updates.map((update) => (
                <Card key={update.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{update.period}</CardTitle>
                        {getHealthBadge(update.overallHealth)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(update.date)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {update.highlights && (
                      <div>
                        <h4 className="font-medium text-green-700 mb-1">
                          Highlights
                        </h4>
                        <p className="text-sm">{update.highlights}</p>
                      </div>
                    )}
                    {update.challenges && (
                      <div>
                        <h4 className="font-medium text-yellow-700 mb-1">
                          Challenges
                        </h4>
                        <p className="text-sm">{update.challenges}</p>
                      </div>
                    )}
                    {update.askFromInvestors && (
                      <div>
                        <h4 className="font-medium text-blue-700 mb-1">
                          Ask from Investors
                        </h4>
                        <p className="text-sm">{update.askFromInvestors}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Key Milestones</h3>
            <Dialog
              open={isMilestoneDialogOpen}
              onOpenChange={setIsMilestoneDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Milestone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Milestone</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={milestoneForm.date}
                        onChange={(e) =>
                          setMilestoneForm({ ...milestoneForm, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={milestoneForm.category}
                        onValueChange={(value) =>
                          setMilestoneForm({ ...milestoneForm, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="funding">Funding</SelectItem>
                          <SelectItem value="product">Product</SelectItem>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="team">Team</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="e.g., Launched v2.0, Raised Series A"
                      value={milestoneForm.title}
                      onChange={(e) =>
                        setMilestoneForm({ ...milestoneForm, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Details about this milestone..."
                      value={milestoneForm.description}
                      onChange={(e) =>
                        setMilestoneForm({
                          ...milestoneForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Impact</Label>
                    <Select
                      value={milestoneForm.impact}
                      onValueChange={(value) =>
                        setMilestoneForm({ ...milestoneForm, impact: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddMilestone} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Milestone"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!investment.milestones?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flag className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No milestones yet</h3>
                <p className="text-muted-foreground">
                  Track key company milestones and achievements
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {investment.milestones.map((milestone) => (
                  <div key={milestone.id} className="relative pl-10">
                    <div
                      className={`absolute left-2.5 w-3 h-3 rounded-full ${
                        milestone.impact === "positive"
                          ? "bg-green-500"
                          : milestone.impact === "negative"
                          ? "bg-red-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{milestone.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {milestone.category}
                              </Badge>
                            </div>
                            {milestone.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(milestone.date)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Communication Log</h3>
            <Dialog open={isCommDialogOpen} onOpenChange={setIsCommDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Communication
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Communication</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={commForm.date}
                        onChange={(e) =>
                          setCommForm({ ...commForm, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={commForm.type}
                        onValueChange={(value) =>
                          setCommForm({ ...commForm, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      placeholder="Brief topic"
                      value={commForm.subject}
                      onChange={(e) =>
                        setCommForm({ ...commForm, subject: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Summary</Label>
                    <Textarea
                      placeholder="Key discussion points and takeaways..."
                      value={commForm.summary}
                      onChange={(e) =>
                        setCommForm({ ...commForm, summary: e.target.value })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={commForm.followUpRequired}
                      onChange={(e) =>
                        setCommForm({
                          ...commForm,
                          followUpRequired: e.target.checked,
                        })
                      }
                    />
                    Follow-up Required
                  </label>
                </div>
                <DialogFooter>
                  <Button onClick={handleAddCommunication} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Log Communication"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!investment.communications?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No communications logged</h3>
                <p className="text-muted-foreground">
                  Track your interactions with founders
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {investment.communications.map((comm) => (
                <Card key={comm.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded">
                        {getCommIcon(comm.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {comm.subject || `${comm.type} with founder`}
                            </span>
                            {comm.followUpRequired && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Follow-up
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(comm.date)}
                          </span>
                        </div>
                        {comm.summary && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {comm.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Board Meetings Tab */}
        <TabsContent value="board" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Board Meetings</h3>
            <Dialog
              open={isBoardMeetingDialogOpen}
              onOpenChange={setIsBoardMeetingDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Meeting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Board Meeting</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground">
                  Board meeting form would go here
                </p>
                <DialogFooter>
                  <Button onClick={() => setIsBoardMeetingDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {!investment.boardMeetings?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold">No board meetings</h3>
                <p className="text-muted-foreground">
                  {investment.boardSeat
                    ? "Track board meetings and decisions"
                    : "No board seat for this investment"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {investment.boardMeetings.map((meeting) => (
                <Card key={meeting.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {meeting.type} Board Meeting
                          </span>
                          {meeting.location && (
                            <span className="text-sm text-muted-foreground">
                              • {meeting.location}
                            </span>
                          )}
                        </div>
                        {meeting.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {meeting.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(meeting.date)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
