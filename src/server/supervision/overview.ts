import type { Prisma } from "@/generated/prisma/client"
import type { ActorContext } from "@/server/auth/actor"
import { loadDailyRange, totalOf } from "@/server/commissions/daily-range"
import {
  dailySeries,
  percentChange,
  periodRanges,
  shares,
  type DayVolume,
  type Range,
  type SupervisionPeriod,
} from "@/server/supervision/compute"

const CHART_DAYS = 7

// Branches in view: the owner sees all (null) or the one chosen; a manager only theirs.
export function branchScope(ctx: ActorContext, requested: string | null): string[] | null {
  if (ctx.actor.role === "OWNER") return requested ? [requested] : null
  const own = [...ctx.actor.branchIds]
  return requested && own.includes(requested) ? [requested] : own
}

export function inScope(scope: string[] | null): Prisma.TransactionWhereInput {
  return scope ? { branchId: { in: scope } } : {}
}

function validIn(scope: string[] | null, range: Range): Prisma.TransactionWhereInput {
  return { ...inScope(scope), status: "VALID", createdAt: { gte: range.from, lte: range.to } }
}

export type OperatorShare = { id: string; name: string; color: string | null; volume: number; percent: number }

export type Overview = {
  volume: number
  volumeChange: number | null
  commission: number
  commissionChange: number | null
  count: number
  deposits: number
  withdrawals: number
  daily: DayVolume[]
  operators: OperatorShare[]
}

export async function loadOverview(ctx: ActorContext, scope: string[] | null, period: SupervisionPeriod, now: Date): Promise<Overview> {
  const { current, previous } = periodRanges(period, now)
  const chartFrom = new Date(periodRanges("7d", now).current.from)

  const [currentDays, previousDays, totals, before, byType, byOperator, chartRows] = await Promise.all([
    loadDailyRange(ctx, { branchIds: scope, from: current.from, to: current.to }, now),
    loadDailyRange(ctx, { branchIds: scope, from: previous.from, to: previous.to }, now),
    ctx.db.transaction.aggregate({ where: validIn(scope, current), _sum: { amount: true, commission: true }, _count: { _all: true } }),
    ctx.db.transaction.aggregate({ where: validIn(scope, previous), _sum: { amount: true, commission: true } }),
    ctx.db.transaction.groupBy({ by: ["type"], where: validIn(scope, current), _count: { _all: true } }),
    ctx.db.transaction.groupBy({ by: ["operatorId"], where: validIn(scope, current), _sum: { amount: true } }),
    ctx.db.transaction.findMany({
      where: validIn(scope, { from: chartFrom, to: now }),
      select: { createdAt: true, amount: true },
    }),
  ])

  const operators = await ctx.db.operatorCatalog.findMany({
    where: { id: { in: byOperator.map((row) => row.operatorId) } },
    select: { id: true, name: true, color: true },
  })
  const operatorById = new Map(operators.map((operator) => [operator.id, operator]))
  const operatorShares = shares(byOperator.map((row) => ({ id: row.operatorId, value: row._sum.amount ?? 0 })))
  const countOf = (type: string) => byType.find((row) => row.type === type)?._count._all ?? 0

  const volume = totals._sum.amount ?? 0
  // Per-operation commissions + the day's commissions of daily-volume operators (per branch).
  const commission = (totals._sum.commission ?? 0) + totalOf(currentDays)

  return {
    volume,
    volumeChange: percentChange(volume, before._sum.amount ?? 0),
    commission,
    commissionChange: percentChange(commission, (before._sum.commission ?? 0) + totalOf(previousDays)),
    count: totals._count._all,
    deposits: countOf("DEPOSIT"),
    withdrawals: countOf("WITHDRAWAL"),
    daily: dailySeries(chartRows, CHART_DAYS, now),
    operators: operatorShares
      .map((share) => ({
        id: share.id,
        name: operatorById.get(share.id)?.name ?? "Opérateur",
        color: operatorById.get(share.id)?.color ?? null,
        volume: share.value,
        percent: share.percent,
      }))
      .sort((a, b) => b.volume - a.volume),
  }
}
