import type { PrismaClient } from "@/generated/prisma/client"
import type { CommissionMode } from "@/generated/prisma/enums"
import { checkTiers, tiersInForce, type Tier } from "@/server/commissions/daily"
import type { ActionResult } from "@/server/result"

// Commission scale of a catalogue operator, set by the SaaS admin for every organization.
// Called with the client from getAdminDb().

export type OperatorScale = {
  id: string
  name: string
  color: string | null
  logoUpdatedAt: Date | null
  mode: CommissionMode
  tiers: Tier[] // in force now, lowest first
  since: Date | null // when the scale in force started
}

export async function loadScale(db: PrismaClient, operatorId: string, now = new Date()): Promise<OperatorScale | null> {
  const operator = await db.operatorCatalog.findUnique({
    where: { id: operatorId },
    select: {
      id: true,
      name: true,
      color: true,
      commissionMode: true,
      logo: { select: { updatedAt: true } },
      commissionTiers: { select: { minAmount: true, maxAmount: true, commission: true, validFrom: true, validTo: true } },
    },
  })
  if (!operator) return null
  const current = tiersInForce(operator.commissionTiers, now).sort((a, b) => a.minAmount - b.minAmount)
  return {
    id: operator.id,
    name: operator.name,
    color: operator.color,
    logoUpdatedAt: operator.logo?.updatedAt ?? null,
    mode: operator.commissionMode,
    tiers: current.map(({ minAmount, maxAmount, commission }) => ({ minAmount, maxAmount, commission })),
    since: current[0]?.validFrom ?? null,
  }
}

// Saves the mode and, in DAILY_VOLUME, a new scale: in ONE SQL transaction the tiers in force
// are closed (never deleted) and the new ones start now. A past day keeps the scale it had.
export async function saveScale(db: PrismaClient, operatorId: string, mode: CommissionMode, tiers: readonly Tier[], now = new Date()): Promise<ActionResult> {
  const check = mode === "DAILY_VOLUME" ? checkTiers(tiers) : null
  if (check && !check.ok) return check

  const operator = await db.operatorCatalog.findUnique({ where: { id: operatorId }, select: { id: true } })
  if (!operator) return { ok: false, error: "Opérateur introuvable." }

  await db.$transaction(async (tx) => {
    await tx.operatorCatalog.update({ where: { id: operatorId }, data: { commissionMode: mode } })
    if (!check?.ok) return // per-operation mode: the scale in force is kept as it is, unused
    await tx.operatorCommissionTier.updateMany({ where: { operatorId, validTo: null }, data: { validTo: now } })
    await tx.operatorCommissionTier.createMany({ data: check.tiers.map((tier) => ({ operatorId, ...tier, validFrom: now })) })
  })
  return { ok: true }
}
