import { startOfDakarDay } from "@/lib/dates"
import { operatorLogoSrc } from "@/lib/operator-logo"
import type { ActorContext } from "@/server/auth/actor"
import { DAILY_VOLUME_TYPES, dailyCommission, tiersInForce, type DailyCommission, type Tier } from "@/server/commissions/daily"

export type DailyCommissionRow = DailyCommission & {
  branchId: string
  branchName: string
  operatorId: string
  operatorName: string
  color: string | null
  logoSrc: string | null
  hasScale: boolean // false: the SaaS admin has not set this operator's tiers yet
}

export type DailyCommissions = { rows: DailyCommissionRow[]; total: number }

const NONE: DailyCommissions = { rows: [], total: 0 }

// Today's commission of every daily-volume operator, per branch (each branch has its own agent
// account, so its own total and tier). Owner: every branch; manager and agent: their branches.
// It is the branch's commission: an agent sees it for their branch, not as their own.
export async function loadDailyCommissions(ctx: ActorContext, now = new Date()): Promise<DailyCommissions> {
  const branchScope = ctx.actor.role === "OWNER" ? {} : { branchId: { in: [...ctx.actor.branchIds] } }

  // UV accounts of daily-volume operators the organization uses: one row each, even at 0 today.
  const accounts = await ctx.db.account.findMany({
    where: {
      ...branchScope,
      kind: "OPERATOR",
      isActive: true,
      branch: { isActive: true },
      // Nested filters are not scoped by the tenant client: the activation must be this organization's.
      operator: { isActive: true, commissionMode: "DAILY_VOLUME", orgOperators: { some: { isActive: true, organizationId: ctx.organizationId } } },
    },
    orderBy: [{ branch: { createdAt: "asc" } }, { label: "asc" }],
    select: {
      branchId: true,
      branch: { select: { name: true } },
      operator: { select: { id: true, name: true, color: true, logo: { select: { updatedAt: true } } } },
    },
  })
  if (accounts.length === 0) return NONE
  const operatorIds = [...new Set(accounts.flatMap((account) => (account.operator ? [account.operator.id] : [])))]

  const [volumes, tiers] = await Promise.all([
    ctx.db.transaction.groupBy({
      by: ["branchId", "operatorId"],
      where: {
        ...branchScope,
        operatorId: { in: operatorIds },
        status: "VALID",
        type: { in: [...DAILY_VOLUME_TYPES] },
        createdAt: { gte: startOfDakarDay(now), lte: now },
      },
      _sum: { amount: true },
    }),
    // Global scale of the SaaS admin (no tenant), with its history.
    ctx.db.operatorCommissionTier.findMany({
      where: { operatorId: { in: operatorIds } },
      select: { operatorId: true, minAmount: true, maxAmount: true, commission: true, validFrom: true, validTo: true },
    }),
  ])
  const volumeOf = new Map(volumes.map((row) => [`${row.branchId}:${row.operatorId}`, row._sum.amount ?? 0]))
  const scaleOf = (operatorId: string) => tiersInForce(tiers.filter((tier) => tier.operatorId === operatorId), now)

  const rows = accounts.flatMap((account) => {
    const operator = account.operator
    if (!operator) return []
    const scale = scaleOf(operator.id)
    return [{
      ...dailyCommission(scale, volumeOf.get(`${account.branchId}:${operator.id}`) ?? 0),
      branchId: account.branchId,
      branchName: account.branch.name,
      operatorId: operator.id,
      operatorName: operator.name,
      color: operator.color,
      logoSrc: operatorLogoSrc(operator.id, operator.logo?.updatedAt),
      hasScale: scale.length > 0,
    }]
  })
  return { rows, total: rows.reduce((sum, row) => sum + row.commission, 0) }
}

export type OperatorScaleView = { operatorId: string; tiers: Tier[] }

// The scales in force of the given daily-volume operators, for the organization's commission
// screen (read only: the SaaS admin sets them).
export async function loadScalesInForce(ctx: ActorContext, operatorIds: readonly string[], now = new Date()): Promise<OperatorScaleView[]> {
  if (operatorIds.length === 0) return []
  const rows = await ctx.db.operatorCommissionTier.findMany({
    where: { operatorId: { in: [...operatorIds] } },
    select: { operatorId: true, minAmount: true, maxAmount: true, commission: true, validFrom: true, validTo: true },
  })
  return operatorIds.map((operatorId) => ({
    operatorId,
    tiers: tiersInForce(rows.filter((row) => row.operatorId === operatorId), now)
      .sort((a, b) => a.minAmount - b.minAmount)
      .map(({ minAmount, maxAmount, commission }) => ({ minAmount, maxAmount, commission })),
  }))
}
