import { dayKey } from "@/lib/dates"
import type { ActorContext } from "@/server/auth/actor"
import { DAILY_VOLUME_TYPES, dailyCommission, tiersInForce } from "@/server/commissions/daily"

// Daily-volume commissions over a period (statistics, supervision, closing): one commission per
// Dakar day, branch and operator, each day with the scale in force that day.

const DAY_MS = 24 * 60 * 60 * 1000

export type VolumeRow = { createdAt: Date; branchId: string; operatorId: string; amount: number }
export type TierRow = { operatorId: string; minAmount: number; maxAmount: number | null; commission: number; validFrom: Date; validTo: Date | null }
export type DayCommission = { day: string; branchId: string; operatorId: string; volume: number; commission: number }

// Pure. A day is priced with the scale in force at its end (or now, for today).
export function computeDailyRange(rows: readonly VolumeRow[], tiers: readonly TierRow[], now: Date): DayCommission[] {
  const groups = new Map<string, DayCommission>()
  for (const row of rows) {
    const day = dayKey(row.createdAt)
    const key = `${day}|${row.branchId}|${row.operatorId}`
    const group = groups.get(key) ?? { day, branchId: row.branchId, operatorId: row.operatorId, volume: 0, commission: 0 }
    group.volume += row.amount
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => {
    const endOfDay = new Date(new Date(`${group.day}T00:00:00.000Z`).getTime() + DAY_MS - 1) // Dakar is UTC+0
    const at = endOfDay < now ? endOfDay : now
    const scale = tiersInForce(tiers.filter((tier) => tier.operatorId === group.operatorId), at)
    return { ...group, commission: dailyCommission(scale, group.volume).commission }
  })
}

export function sumBy(days: readonly DayCommission[], key: (day: DayCommission) => string): Map<string, number> {
  const sums = new Map<string, number>()
  for (const day of days) sums.set(key(day), (sums.get(key(day)) ?? 0) + day.commission)
  return sums
}

export function totalOf(days: readonly DayCommission[]): number {
  return days.reduce((sum, day) => sum + day.commission, 0)
}

// Branches whose daily commissions a user may see: owner every branch (null), others theirs.
// A day's commission belongs to the branch, so an agent sees their branch's.
export function dailyBranchScope(ctx: ActorContext): string[] | null {
  return ctx.actor.role === "OWNER" ? null : [...ctx.actor.branchIds]
}

export async function loadDailyRange(
  ctx: ActorContext,
  scope: { branchIds: readonly string[] | null; from: Date; to: Date },
  now = new Date(),
): Promise<DayCommission[]> {
  const rows = await ctx.db.transaction.findMany({
    where: {
      ...(scope.branchIds ? { branchId: { in: [...scope.branchIds] } } : {}),
      status: "VALID",
      type: { in: [...DAILY_VOLUME_TYPES] },
      createdAt: { gte: scope.from, lte: scope.to },
      operator: { commissionMode: "DAILY_VOLUME" }, // global catalogue: no tenant to scope here
    },
    select: { createdAt: true, branchId: true, operatorId: true, amount: true },
  })
  if (rows.length === 0) return []
  const tiers = await ctx.db.operatorCommissionTier.findMany({
    where: { operatorId: { in: [...new Set(rows.map((row) => row.operatorId))] } },
    select: { operatorId: true, minAmount: true, maxAmount: true, commission: true, validFrom: true, validTo: true },
  })
  return computeDailyRange(rows, tiers, now)
}
