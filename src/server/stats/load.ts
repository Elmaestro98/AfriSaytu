import type { Prisma } from "@/generated/prisma/client"
import type { TransactionTypeKey } from "@/lib/operation-types"
import { operatorLogoSrc } from "@/lib/operator-logo"
import type { ActorContext } from "@/server/auth/actor"
import { authorize, type Actor } from "@/server/auth/permissions"
import { dailyBranchScope, loadDailyRange, sumBy, totalOf } from "@/server/commissions/daily-range"
import { visibilityWhere } from "@/server/operations/history-where"
import { averageCommission, chartDays, chartStart, dailyTotals, typeBreakdown, type DayTotals, type TypeShare } from "@/server/stats/compute"
import { percentChange, periodRanges, shares, type Range, type SupervisionPeriod } from "@/server/supervision/compute"

export class StatsAccessError extends Error {}

// Validated operations of a time range that the actor may see: everything (owner), their branches
// (manager), their own operations (agent). The organization filter is added by the tenant client.
export function statsWhere(actor: Actor, range: Range): Prisma.TransactionWhereInput {
  return { AND: [visibilityWhere(actor), { status: "VALID", createdAt: { gte: range.from, lte: range.to } }] }
}

export type OperatorStat = { id: string; name: string; color: string | null; logoSrc: string | null; volume: number; commission: number; percent: number }
export type AgentStat = { memberId: string; name: string; count: number; volume: number; commission: number }

export type Stats = {
  volume: number
  volumeChange: number | null
  commission: number
  commissionChange: number | null
  dailyCommission: number // part of `commission` earned on the day's total (daily-volume operators)
  count: number
  countChange: number | null
  averageCommission: number
  daily: DayTotals[]
  operators: OperatorStat[]
  types: TypeShare[]
  agents: AgentStat[] | null // null for an agent: they only see themselves
}

export async function loadStats(ctx: ActorContext, period: SupervisionPeriod, now: Date): Promise<Stats> {
  if (!authorize(ctx.actor, "transaction:view").allowed) throw new StatsAccessError()

  const { current, previous } = periodRanges(period, now)
  const days = chartDays(period, now)
  const where = statsWhere(ctx.actor, current)
  const sums = { _count: { _all: true }, _sum: { amount: true, commission: true } } as const
  const showAgents = ctx.actor.role !== "AGENT"

  // Daily-volume commissions belong to branches: same branches as the user's view.
  const branchIds = dailyBranchScope(ctx)
  const chartFrom = chartStart(days, now)
  const [currentDays, previousDays, chartDaysCommissions] = await Promise.all([
    loadDailyRange(ctx, { branchIds, from: current.from, to: current.to }, now),
    loadDailyRange(ctx, { branchIds, from: previous.from, to: previous.to }, now),
    loadDailyRange(ctx, { branchIds, from: chartFrom, to: now }, now),
  ])

  const [totals, before, byType, byOperator, byMember, chartRows] = await Promise.all([
    ctx.db.transaction.aggregate({ where, ...sums }),
    ctx.db.transaction.aggregate({ where: statsWhere(ctx.actor, previous), ...sums }),
    ctx.db.transaction.groupBy({ by: ["type"], where, ...sums }),
    ctx.db.transaction.groupBy({ by: ["operatorId"], where, _sum: { amount: true, commission: true } }),
    showAgents ? ctx.db.transaction.groupBy({ by: ["memberId"], where, ...sums }) : Promise.resolve([]),
    ctx.db.transaction.findMany({
      where: statsWhere(ctx.actor, { from: chartFrom, to: now }),
      select: { createdAt: true, amount: true, commission: true },
    }),
  ])

  const [operators, members] = await Promise.all([
    ctx.db.operatorCatalog.findMany({ where: { id: { in: byOperator.map((row) => row.operatorId) } }, select: { id: true, name: true, color: true, logo: { select: { updatedAt: true } } } }),
    showAgents ? ctx.db.member.findMany({ where: { id: { in: byMember.map((row) => row.memberId) } }, select: { id: true, name: true } }) : Promise.resolve([]),
  ])
  const operatorById = new Map(operators.map((operator) => [operator.id, operator]))
  const memberName = new Map(members.map((member) => [member.id, member.name]))
  const operatorPercent = new Map(shares(byOperator.map((row) => ({ id: row.operatorId, value: row._sum.amount ?? 0 }))).map((share) => [share.id, share.percent]))

  const volume = totals._sum.amount ?? 0
  const dailyCommission = totalOf(currentDays)
  const commission = (totals._sum.commission ?? 0) + dailyCommission
  const dailyByOperator = sumBy(currentDays, (day) => day.operatorId)
  const dailyByDay = sumBy(chartDaysCommissions, (day) => day.day)
  const count = totals._count._all

  return {
    volume,
    volumeChange: percentChange(volume, before._sum.amount ?? 0),
    commission,
    commissionChange: percentChange(commission, (before._sum.commission ?? 0) + totalOf(previousDays)),
    dailyCommission,
    count,
    countChange: percentChange(count, before._count._all),
    averageCommission: averageCommission(commission, count),
    daily: dailyTotals(chartRows, days, now).map((day) => ({ ...day, commission: day.commission + (dailyByDay.get(day.key) ?? 0) })),
    operators: byOperator
      .map((row) => ({
        id: row.operatorId,
        name: operatorById.get(row.operatorId)?.name ?? "Opérateur",
        color: operatorById.get(row.operatorId)?.color ?? null,
        logoSrc: operatorLogoSrc(row.operatorId, operatorById.get(row.operatorId)?.logo?.updatedAt),
        volume: row._sum.amount ?? 0,
        commission: (row._sum.commission ?? 0) + (dailyByOperator.get(row.operatorId) ?? 0),
        percent: operatorPercent.get(row.operatorId) ?? 0,
      }))
      .sort((a, b) => b.volume - a.volume),
    types: typeBreakdown(
      byType.map((row) => ({
        type: row.type as TransactionTypeKey,
        count: row._count._all,
        volume: row._sum.amount ?? 0,
        commission: row._sum.commission ?? 0,
      })),
    ),
    agents: showAgents
      ? byMember
          .map((row) => ({
            memberId: row.memberId,
            name: memberName.get(row.memberId) ?? "Membre",
            count: row._count._all,
            volume: row._sum.amount ?? 0,
            commission: row._sum.commission ?? 0,
          }))
          .sort((a, b) => b.commission - a.commission || b.volume - a.volume)
      : null,
  }
}
