import { monthRange } from "@/lib/dates"
import { operatorLogoSrc } from "@/lib/operator-logo"
import type { ActorContext } from "@/server/auth/actor"
import { loadDailyRange, sumBy } from "@/server/commissions/daily-range"
import { reconcile, type ReconciliationRow } from "@/server/commissions/reconcile"

export class ReconciliationAccessError extends Error {}

export type ReconciliationLine = ReconciliationRow & {
  name: string
  color: string | null
  logoSrc: string | null
  daily: number // part of `estimated` earned on the day's total
}

export type Reconciliation = {
  month: string
  lines: ReconciliationLine[]
  estimated: number
  received: number
  gap: number
  unassigned: number // payouts recorded without an operator (before F-55): not in any line
}

// Commission reconciliation of one month (F-55): owner (every branch) and managers (their
// branches). Agents do not see the operators' payouts.
export async function loadReconciliation(ctx: ActorContext, month: string, now = new Date()): Promise<Reconciliation> {
  if (ctx.actor.role === "AGENT") throw new ReconciliationAccessError()
  const branchIds = ctx.actor.role === "OWNER" ? null : [...ctx.actor.branchIds]
  const inBranches = branchIds ? { branchId: { in: branchIds } } : {}
  const range = monthRange(month)
  const to = range.to < now ? range.to : now

  const [perOperation, days, payouts] = await Promise.all([
    ctx.db.transaction.groupBy({
      by: ["operatorId"],
      where: { ...inBranches, status: "VALID", createdAt: { gte: range.from, lte: to } },
      _sum: { commission: true },
    }),
    loadDailyRange(ctx, { branchIds, from: range.from, to }, now),
    ctx.db.internalMovement.groupBy({
      by: ["operatorId"],
      where: { ...inBranches, kind: "COMMISSION_PAYOUT", payoutMonth: month },
      _sum: { amount: true },
    }),
  ])

  const daily = sumBy(days, (day) => day.operatorId)
  const estimated = new Map(perOperation.map((row) => [row.operatorId, row._sum.commission ?? 0]))
  for (const [operatorId, amount] of daily) estimated.set(operatorId, (estimated.get(operatorId) ?? 0) + amount)
  const received = new Map(payouts.flatMap((row) => (row.operatorId ? [[row.operatorId, row._sum.amount ?? 0] as const] : [])))
  const rows = reconcile(estimated, received)

  const operators = await ctx.db.operatorCatalog.findMany({
    where: { id: { in: rows.map((row) => row.operatorId) } },
    select: { id: true, name: true, color: true, logo: { select: { updatedAt: true } } },
  })
  const byId = new Map(operators.map((operator) => [operator.id, operator]))
  const lines = rows.map((row) => {
    const operator = byId.get(row.operatorId)
    return {
      ...row,
      name: operator?.name ?? "Opérateur",
      color: operator?.color ?? null,
      logoSrc: operator ? operatorLogoSrc(operator.id, operator.logo?.updatedAt) : null,
      daily: daily.get(row.operatorId) ?? 0,
    }
  })

  const sum = (pick: (line: ReconciliationLine) => number) => lines.reduce((total, line) => total + pick(line), 0)
  return {
    month,
    lines,
    estimated: sum((line) => line.estimated),
    received: sum((line) => line.received),
    gap: sum((line) => line.gap),
    unassigned: payouts.filter((row) => row.operatorId === null).reduce((total, row) => total + (row._sum.amount ?? 0), 0),
  }
}
