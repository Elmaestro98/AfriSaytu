import { operatorLogoSrc } from "@/lib/operator-logo"
import type { SetOperatorActiveInput, SetSendFeeInput } from "@/schemas/settings"
import { resolveEffects, sendFeeFromUv, withSendFeeFromUv } from "@/server/ledger/effects"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { recordAudit } from "@/server/audit/log"
import type { ActionResult } from "@/server/result"
import { refuseWriteIfInactive } from "@/server/plans/current"

export type OrgOperatorRow = {
  operatorId: string
  name: string
  color: string | null
  logoSrc: string | null
  isActive: boolean // active for this organization
  sendFeeFromUv: boolean // SEND: is the customer fee also taken from the agent's UV?
}

// Global catalogue, with the organization's own activation status.
export async function listOrgOperators(ctx: ActorContext): Promise<OrgOperatorRow[]> {
  const [catalog, activations] = await Promise.all([
    ctx.db.operatorCatalog.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, defaultEffects: true, logo: { select: { updatedAt: true } } },
    }),
    ctx.db.orgOperator.findMany({ select: { operatorId: true, isActive: true, effectsConfig: true } }),
  ])
  const byOperator = new Map(activations.map((row) => [row.operatorId, row]))

  return catalog.map((operator) => {
    const activation = byOperator.get(operator.id)
    return {
      operatorId: operator.id,
      name: operator.name,
      color: operator.color,
      logoSrc: operatorLogoSrc(operator.id, operator.logo?.updatedAt),
      isActive: activation?.isActive ?? false,
      sendFeeFromUv: sendFeeFromUv(resolveEffects(operator.defaultEffects, activation?.effectsConfig)),
    }
  })
}

// Operators the organization has switched on: the only ones that can get new accounts.
export async function listActiveOrgOperators(ctx: ActorContext) {
  const rows = await ctx.db.orgOperator.findMany({
    where: { isActive: true, operator: { isActive: true } },
    select: { operator: { select: { id: true, name: true, color: true, commissionMode: true, logo: { select: { updatedAt: true } } } } },
  })
  return rows.map(({ operator: { logo, ...operator } }) => ({ ...operator, logoSrc: operatorLogoSrc(operator.id, logo?.updatedAt) }))
}

// Switching an operator on or off applies to every branch, so it is kept to the owner
// (a manager only acts on their own branches). Off = hidden at entry, history kept.
export function canToggleOperators(ctx: ActorContext): boolean {
  const decision = authorize(ctx.actor, "catalog:manage")
  return decision.allowed && decision.scope === "ALL"
}

export async function setOperatorActive(
  ctx: ActorContext,
  input: SetOperatorActiveInput,
): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  if (!canToggleOperators(ctx)) {
    return { ok: false, error: "Seul le propriétaire peut activer ou désactiver un opérateur." }
  }

  const operator = await ctx.db.operatorCatalog.findFirst({
    where: { id: input.operatorId, isActive: true },
    select: { id: true },
  })
  if (!operator) return { ok: false, error: "Opérateur introuvable." }

  const existing = await ctx.db.orgOperator.findFirst({
    where: { operatorId: operator.id },
    select: { id: true, isActive: true },
  })
  if (existing?.isActive === input.active) return { ok: true }

  if (existing) {
    await ctx.db.orgOperator.update({ where: { id: existing.id }, data: { isActive: input.active } })
  } else {
    await ctx.db.orgOperator.create({
      data: { organizationId: ctx.organizationId, operatorId: operator.id, isActive: input.active },
    })
  }

  await recordAudit(ctx, {
    action: input.active ? "operator.activate" : "operator.deactivate",
    entity: "OrgOperator",
    entityId: operator.id,
    before: { isActive: existing?.isActive ?? false },
    after: { isActive: input.active },
  })
  return { ok: true }
}

// Adjustable per operator (cahier 6.1 "- frais opérateur éventuels"): is the SEND fee also
// taken from the agent's UV? Applies to future operations only.
export async function setSendFeeFromUv(ctx: ActorContext, input: SetSendFeeInput): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  if (!canToggleOperators(ctx)) {
    return { ok: false, error: "Seul le propriétaire peut modifier ce réglage." }
  }

  const activation = await ctx.db.orgOperator.findFirst({
    where: { operatorId: input.operatorId },
    select: { id: true, effectsConfig: true },
  })
  if (!activation) return { ok: false, error: "Activez d'abord cet opérateur." }

  await ctx.db.orgOperator.update({
    where: { id: activation.id },
    data: { effectsConfig: withSendFeeFromUv(activation.effectsConfig, input.fromUv) },
  })
  await recordAudit(ctx, {
    action: "operator.effects",
    entity: "OrgOperator",
    entityId: input.operatorId,
    after: { sendFeeFromUv: input.fromUv },
  })
  return { ok: true }
}
