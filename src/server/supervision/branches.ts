import { balanceLevel } from "@/lib/balance-level"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { buildAlerts, STALE_HOURS, type Alert } from "@/server/dashboard/alerts"
import { getBalances } from "@/server/ledger/balances"
import { periodRanges, type SupervisionPeriod } from "@/server/supervision/compute"

export type BranchRow = {
  id: string
  name: string
  count: number
  volume: number
  commission: number
  uv: number
  cash: number
  lowBalances: number
  lastClosing: { at: Date; difference: number } | null
  hoursOpen: number // since the last closing (or the creation of the branch)
}

export type BranchesView = { rows: BranchRow[]; alerts: Alert[] }

// One line per branch in view (the multi-branch view of mockup 01), and the network alerts.
export async function loadBranches(ctx: ActorContext, scope: string[] | null, period: SupervisionPeriod, now: Date): Promise<BranchesView> {
  const { current } = periodRanges(period, now)
  const branchWhere = { isActive: true, ...(scope ? { id: { in: scope } } : {}) }
  const inPeriod = { status: "VALID" as const, createdAt: { gte: current.from, lte: current.to }, ...(scope ? { branchId: { in: scope } } : {}) }

  const [branches, byBranch, noRuleCount, accounts, periodClosings] = await Promise.all([
    ctx.db.branch.findMany({
      where: branchWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        closings: { where: { status: "CLOSED" }, orderBy: { closedAt: "desc" }, take: 1, select: { closedAt: true, lines: { select: { difference: true } } } },
      },
    }),
    ctx.db.transaction.groupBy({ by: ["branchId"], where: inPeriod, _count: { _all: true }, _sum: { amount: true, commission: true } }),
    ctx.db.transaction.count({ where: { ...inPeriod, noRule: true } }),
    ctx.db.account.findMany({
      where: { isActive: true, branch: branchWhere },
      select: { id: true, label: true, kind: true, branchId: true, alertThreshold: true, branch: { select: { name: true } } },
    }),
    ctx.db.dailyClosing.findMany({
      where: { status: "CLOSED", closedAt: { gte: current.from, lte: current.to }, ...(scope ? { branchId: { in: scope } } : {}) },
      select: { branch: { select: { name: true } }, lines: { select: { difference: true } } },
    }),
  ])
  const balances = await getBalances(ctx.db, accounts.map((account) => account.id))
  const accountRows = accounts.map((account) => {
    const balance = balances.get(account.id) ?? 0
    return { ...account, balance, level: balanceLevel(balance, account.alertThreshold) }
  })
  const totalsOf = new Map(byBranch.map((row) => [row.branchId, row]))
  const difference = (lines: readonly { difference: number }[]) => lines.reduce((sum, line) => sum + line.difference, 0)

  const rows: BranchRow[] = branches.map((branch) => {
    const own = accountRows.filter((account) => account.branchId === branch.id)
    const last = branch.closings[0]
    const since = last?.closedAt ?? branch.createdAt
    const totals = totalsOf.get(branch.id)
    return {
      id: branch.id,
      name: branch.name,
      count: totals?._count._all ?? 0,
      volume: totals?._sum.amount ?? 0,
      commission: totals?._sum.commission ?? 0,
      uv: own.filter((account) => account.kind === "OPERATOR").reduce((sum, account) => sum + account.balance, 0),
      cash: own.filter((account) => account.kind === "CASH").reduce((sum, account) => sum + account.balance, 0),
      lowBalances: own.filter((account) => account.level.low).length,
      lastClosing: last?.closedAt ? { at: last.closedAt, difference: difference(last.lines) } : null,
      hoursOpen: (now.getTime() - since.getTime()) / 3_600_000,
    }
  })

  const alerts = buildAlerts({
    showBranch: branches.length > 1,
    canManageRules: authorize(ctx.actor, "commissionRule:manage").allowed,
    noRuleCount,
    lowBalances: accountRows.filter((account) => account.level.low).map((account) => ({ label: account.label, branchName: account.branch.name, missing: account.level.missing })),
    staleBranches: rows.filter((row) => row.hoursOpen > STALE_HOURS).map((row) => ({ name: row.name, hoursOpen: row.hoursOpen })),
    closingsWithDifference: periodClosings
      .map((closing) => ({ branchName: closing.branch.name, difference: difference(closing.lines) }))
      .filter((closing) => closing.difference !== 0),
  })

  return { rows: rows.sort((a, b) => b.volume - a.volume), alerts }
}
