import { balanceLevel, type BalanceLevel } from "@/lib/balance-level"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { buildAlerts, STALE_HOURS, type Alert } from "@/server/dashboard/alerts"
import { getBalances } from "@/server/ledger/balances"
import { visibilityWhere } from "@/server/operations/history-where"
import { dailySeries, percentChange, periodRanges, type DayVolume } from "@/server/supervision/compute"

export type TodayBalance = {
  id: string
  label: string
  branchName: string
  color: string | null
  kind: "OPERATOR" | "CASH"
  balance: number
  alertThreshold: number | null
  level: BalanceLevel
}

export type TodaySummary = {
  volume: number
  volumeChange: number | null // vs yesterday at the same hour
  commission: number
  commissionChange: number | null
  count: number
  deposits: number
  withdrawals: number
  treasury: { uv: number; cash: number }
  balances: TodayBalance[]
  daily: DayVolume[]
  openSince: Date | null // single branch: start of the current day (last closing)
  alerts: Alert[]
  showBranch: boolean
}

// Figures of the current Dakar day, within what the user may see: everything (owner), their
// branches (manager), their own operations (agent). Cancelled operations do not count.
export async function getTodaySummary(ctx: ActorContext, now = new Date()): Promise<TodaySummary> {
  const { current, previous } = periodRanges("today", now)
  const week = periodRanges("7d", now).current
  const seen = { ...visibilityWhere(ctx.actor), status: "VALID" as const }
  const branchWhere = { isActive: true, ...(ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }) }

  const [totals, before, byType, noRuleCount, weekRows, accounts, branches] = await Promise.all([
    ctx.db.transaction.aggregate({ where: { ...seen, createdAt: { gte: current.from } }, _sum: { amount: true, commission: true }, _count: { _all: true } }),
    ctx.db.transaction.aggregate({ where: { ...seen, createdAt: { gte: previous.from, lt: previous.to } }, _sum: { amount: true, commission: true } }),
    ctx.db.transaction.groupBy({ by: ["type"], where: { ...seen, createdAt: { gte: current.from } }, _count: { _all: true } }),
    ctx.db.transaction.count({ where: { ...seen, noRule: true, createdAt: { gte: current.from } } }),
    ctx.db.transaction.findMany({ where: { ...seen, createdAt: { gte: week.from } }, select: { createdAt: true, amount: true } }),
    ctx.db.account.findMany({
      where: { isActive: true, branch: branchWhere },
      orderBy: [{ branch: { createdAt: "asc" } }, { kind: "asc" }, { label: "asc" }],
      select: { id: true, label: true, kind: true, alertThreshold: true, branch: { select: { name: true } }, operator: { select: { color: true } } },
    }),
    ctx.db.branch.findMany({
      where: branchWhere,
      select: {
        name: true,
        createdAt: true,
        closings: {
          where: { status: "CLOSED" },
          orderBy: { closedAt: "desc" },
          take: 1,
          select: { closedAt: true, lines: { select: { difference: true } } },
        },
      },
    }),
  ])
  const amounts = await getBalances(ctx.db, accounts.map((account) => account.id))

  const balances: TodayBalance[] = accounts.map((account) => {
    const balance = amounts.get(account.id) ?? 0
    return {
      id: account.id,
      label: account.label,
      branchName: account.branch.name,
      color: account.operator?.color ?? null,
      kind: account.kind,
      balance,
      alertThreshold: account.alertThreshold,
      level: balanceLevel(balance, account.alertThreshold),
    }
  })

  const showBranch = branches.length > 1
  const volume = totals._sum.amount ?? 0
  const commission = totals._sum.commission ?? 0
  const countOf = (type: string) => byType.find((row) => row.type === type)?._count._all ?? 0
  const sum = (kind: "OPERATOR" | "CASH") => balances.filter((item) => item.kind === kind).reduce((total, item) => total + item.balance, 0)
  const isManager = ctx.actor.role !== "AGENT"

  const branchDays = branches.map((branch) => {
    const last = branch.closings[0]
    const since = last?.closedAt ?? branch.createdAt
    return { name: branch.name, since, closedToday: last?.closedAt && last.closedAt >= current.from ? last : null }
  })

  return {
    volume,
    volumeChange: percentChange(volume, before._sum.amount ?? 0),
    commission,
    commissionChange: percentChange(commission, before._sum.commission ?? 0),
    count: totals._count._all,
    deposits: countOf("DEPOSIT"),
    withdrawals: countOf("WITHDRAWAL"),
    treasury: { uv: sum("OPERATOR"), cash: sum("CASH") },
    balances,
    daily: dailySeries(weekRows, 7, now),
    openSince: branchDays.length === 1 ? branchDays[0].since : null,
    showBranch,
    alerts: buildAlerts({
      showBranch,
      canManageRules: authorize(ctx.actor, "commissionRule:manage").allowed,
      noRuleCount,
      lowBalances: balances.filter((item) => item.level.low).map((item) => ({ label: item.label, branchName: item.branchName, missing: item.level.missing })),
      staleBranches: branchDays
        .map((branch) => ({ name: branch.name, hoursOpen: (now.getTime() - branch.since.getTime()) / 3_600_000 }))
        .filter((branch) => branch.hoursOpen > STALE_HOURS),
      closingsWithDifference: isManager
        ? branchDays
            .filter((branch) => branch.closedToday)
            .map((branch) => ({ branchName: branch.name, difference: branch.closedToday!.lines.reduce((total, line) => total + line.difference, 0) }))
            .filter((closing) => closing.difference !== 0)
        : [],
    }),
  }
}
