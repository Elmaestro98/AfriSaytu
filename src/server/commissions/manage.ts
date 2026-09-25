import { formatAmount } from "@/lib/money"
import { toRuleFields, type CloseRuleInput, type ReplaceRuleInput, type RuleFieldsInput } from "@/schemas/commission-rule"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { recordAudit } from "@/server/audit/log"
import { findOverlap } from "@/server/commissions/resolve"
import type { TenantClient } from "@/server/db/tenant"
import type { ActionResult } from "@/server/result"

// A rule is never edited in place: "modify" closes the current version (validTo = now) and
// creates a new one (validFrom = now). Past operations keep the commission frozen on them.

const DENIED: ActionResult = { ok: false, error: "Vous n'avez pas le droit de gérer les règles de commission." }

function inForceWhere(now: Date) {
  return { isActive: true, OR: [{ validTo: null }, { validTo: { gt: now } }] }
}

async function checkOverlap(
  db: TenantClient,
  rule: RuleFieldsInput,
  now: Date,
  ignoreRuleId?: string,
): Promise<ActionResult> {
  const existing = await db.commissionRule.findMany({
    where: { operatorId: rule.operatorId, type: rule.type, ...inForceWhere(now) },
  })
  const overlap = findOverlap(
    { ...rule, validFrom: now, validTo: null, isActive: true },
    existing.filter((item) => item.id !== ignoreRuleId),
  )
  if (!overlap) return { ok: true }
  return {
    ok: false,
    error: `Cette tranche chevauche la règle ${formatAmount(overlap.minAmount)} – ${formatAmount(overlap.maxAmount)} FCFA.`,
  }
}

async function operatorEnabled(db: TenantClient, operatorId: string): Promise<boolean> {
  const row = await db.orgOperator.findFirst({ where: { operatorId, isActive: true }, select: { id: true } })
  return row !== null
}

function ruleData(ctx: ActorContext, rule: RuleFieldsInput, now: Date) {
  return { ...rule, organizationId: ctx.organizationId, validFrom: now }
}

export async function createRule(ctx: ActorContext, rule: RuleFieldsInput, now = new Date()): Promise<ActionResult> {
  if (!authorize(ctx.actor, "commissionRule:manage").allowed) return DENIED
  if (!(await operatorEnabled(ctx.db, rule.operatorId))) {
    return { ok: false, error: "Cet opérateur n'est pas activé pour votre entreprise." }
  }

  const overlap = await checkOverlap(ctx.db, rule, now)
  if (!overlap.ok) return overlap

  const created = await ctx.db.commissionRule.create({ data: ruleData(ctx, rule, now), select: { id: true } })
  await recordAudit(ctx, { action: "commissionRule.create", entity: "CommissionRule", entityId: created.id, after: rule })
  return { ok: true }
}

export async function replaceRule(ctx: ActorContext, input: ReplaceRuleInput, now = new Date()): Promise<ActionResult> {
  if (!authorize(ctx.actor, "commissionRule:manage").allowed) return DENIED

  const current = await ctx.db.commissionRule.findFirst({ where: { id: input.ruleId, ...inForceWhere(now) } })
  if (!current) return { ok: false, error: "Cette règle n'est plus en vigueur." }
  if (current.operatorId !== input.rule.operatorId || current.type !== input.rule.type) {
    return { ok: false, error: "L'opérateur et le type d'une règle ne changent pas. Créez une nouvelle règle." }
  }

  const overlap = await checkOverlap(ctx.db, input.rule, now, current.id)
  if (!overlap.ok) return overlap

  const created = await ctx.db.$transaction(async (tx) => {
    await tx.commissionRule.update({ where: { id: current.id }, data: { validTo: now } })
    return tx.commissionRule.create({ data: ruleData(ctx, input.rule, now), select: { id: true } })
  })

  await recordAudit(ctx, {
    action: "commissionRule.update",
    entity: "CommissionRule",
    entityId: created.id,
    before: { ...toRuleFields(current), ruleId: current.id },
    after: input.rule,
  })
  return { ok: true }
}

// Stops a rule from now on. The rule stays in the database for the history.
export async function closeRule(ctx: ActorContext, input: CloseRuleInput, now = new Date()): Promise<ActionResult> {
  if (!authorize(ctx.actor, "commissionRule:manage").allowed) return DENIED

  const current = await ctx.db.commissionRule.findFirst({ where: { id: input.ruleId, ...inForceWhere(now) }, select: { id: true } })
  if (!current) return { ok: false, error: "Cette règle n'est plus en vigueur." }

  await ctx.db.commissionRule.update({ where: { id: current.id }, data: { validTo: now } })
  await recordAudit(ctx, {
    action: "commissionRule.close",
    entity: "CommissionRule",
    entityId: current.id,
    after: { validTo: now.toISOString() },
  })
  return { ok: true }
}

export type RuleRow = RuleFieldsInput & { id: string; operatorName: string; operatorColor: string | null }

export async function listRulesInForce(ctx: ActorContext, now = new Date()): Promise<RuleRow[]> {
  const rules = await ctx.db.commissionRule.findMany({
    where: inForceWhere(now),
    orderBy: [{ operator: { name: "asc" } }, { type: "asc" }, { minAmount: "asc" }],
    include: { operator: { select: { name: true, color: true } } },
  })
  return rules.map((rule) => ({
    ...toRuleFields(rule),
    id: rule.id,
    operatorName: rule.operator.name,
    operatorColor: rule.operator.color,
  }))
}
