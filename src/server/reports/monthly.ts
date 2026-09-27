import { dayKey, formatMonth, isMonthKey, monthDayKeys, monthRange } from "@/lib/dates"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { loadReconciliation, type Reconciliation } from "@/server/commissions/reconciliation"
import { visibilityWhere } from "@/server/operations/history-where"
import { getHistoryRetention, getSubscriptionState } from "@/server/plans/current"
import { SUSPENDED_ERROR } from "@/server/plans/lifecycle"
import { summarizeClosings, type ClosingSummary } from "@/server/reports/closings"
import { previousWindow, reportMonths } from "@/server/reports/months"
import { loadStatsBetween, type Stats } from "@/server/stats/load"

// Monthly report (all plans): the month's statistics, closings and, for the owner and managers,
// the commission reconciliation. Every figure comes from the same calculations as the screens.

export class ReportError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export type ReportBranch = { id: string; name: string }

// Branches a report can be narrowed to: every branch (owner), their branches (manager). An agent's
// report is about their own operations: no choice.
export async function reportBranches(ctx: ActorContext): Promise<ReportBranch[]> {
  if (ctx.actor.role === "AGENT") return []
  return ctx.db.branch.findMany({
    where: ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}

export async function availableReportMonths(ctx: ActorContext, now = new Date()): Promise<string[]> {
  const retention = await getHistoryRetention(ctx, now)
  return reportMonths(now, retention?.since ?? null)
}

export type MonthlyReport = {
  month: string
  monthLabel: string // "septembre 2026"
  inProgress: boolean // the current month, so far
  lastDay: string // last day covered, "2026-09-27"
  organizationName: string
  scopeLabel: string
  branchName: string | null // the branch the report was narrowed to
  role: ActorContext["actor"]["role"]
  authorName: string
  generatedAt: Date
  stats: Stats
  cancelled: number
  closings: ClosingSummary
  reconciliation: Reconciliation | null
}

export async function loadMonthlyReport(ctx: ActorContext, month: string, branchId: string | null, now = new Date()): Promise<MonthlyReport> {
  if (!authorize(ctx.actor, "transaction:view").allowed) throw new ReportError("Accès refusé.", 403)
  // Read only still gets its reports, like the exports (F-62); a suspended account does not.
  if ((await getSubscriptionState(ctx, now)).access === "BLOCKED") throw new ReportError(SUSPENDED_ERROR, 403)
  if (!isMonthKey(month) || !(await availableReportMonths(ctx, now)).includes(month)) {
    throw new ReportError("Ce mois n'est pas disponible avec votre formule.", 400)
  }

  const isAgent = ctx.actor.role === "AGENT"
  const branches = await reportBranches(ctx)
  const branch = !isAgent && branchId ? branches.find((item) => item.id === branchId) : undefined
  if (!isAgent && branchId && !branch) throw new ReportError("Point de vente introuvable.", 404)
  const narrow = branch ? [branch.id] : null

  const range = monthRange(month)
  const to = range.to < now ? range.to : now
  const todayKey = dayKey(now)
  const chart = { from: range.from, to, keys: monthDayKeys(month).filter((key) => key <= todayKey) }
  // Closings of the branches in view: the chosen one, all (owner), or the member's branches.
  const closingBranches = narrow ?? (ctx.actor.role === "OWNER" ? null : [...ctx.actor.branchIds])

  const [stats, cancelled, closingRows, reconciliation, organization] = await Promise.all([
    loadStatsBetween(ctx, { current: { from: range.from, to }, previous: previousWindow(month, to), chart, branchIds: narrow }, now),
    ctx.db.transaction.count({
      where: { AND: [visibilityWhere(ctx.actor), narrow ? { branchId: { in: narrow } } : {}, { status: "CANCELLED", createdAt: { gte: range.from, lte: to } }] },
    }),
    ctx.db.dailyClosing.findMany({
      where: { ...(closingBranches ? { branchId: { in: closingBranches } } : {}), status: { in: ["CLOSED", "REOPENED"] }, closedAt: { gte: range.from, lte: to } },
      orderBy: { closedAt: "asc" },
      select: {
        closedAt: true,
        status: true,
        branch: { select: { name: true } },
        lines: { select: { difference: true, justification: true, account: { select: { label: true } } } },
      },
    }),
    isAgent ? Promise.resolve(null) : loadReconciliation(ctx, month, now, narrow),
    ctx.db.organization.findFirst({ select: { name: true } }),
  ])

  return {
    month,
    monthLabel: formatMonth(month),
    inProgress: to < range.to,
    lastDay: dayKey(to),
    organizationName: organization?.name ?? "",
    scopeLabel: isAgent ? "Vos opérations" : branch ? branch.name : branches.length > 1 ? "Tous les points de vente" : (branches[0]?.name ?? ""),
    branchName: branch?.name ?? null,
    role: ctx.actor.role,
    authorName: ctx.memberName,
    generatedAt: now,
    stats,
    cancelled,
    closings: summarizeClosings(
      closingRows.map((row) => ({
        closedAt: row.closedAt ?? range.from,
        status: row.status === "REOPENED" ? "REOPENED" : "CLOSED",
        branchName: row.branch.name,
        lines: row.lines.map((line) => ({ accountLabel: line.account.label, difference: line.difference, justification: line.justification })),
      })),
    ),
    reconciliation,
  }
}
