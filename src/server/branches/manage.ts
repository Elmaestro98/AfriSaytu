import { randomUUID } from "node:crypto"

import type { AddOperatorAccountInput, CreateBranchInput, UpdateAccountInput } from "@/schemas/settings"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { recordAudit } from "@/server/audit/log"
import { UnknownOperatorError, buildBranchAccounts } from "@/server/branches/accounts"
import { countActiveBranches } from "@/server/branches/queries"
import { listActiveOrgOperators } from "@/server/operators/manage"
import { getCurrentPlan, refuseWriteIfInactive } from "@/server/plans/current"
import { PLAN_LABELS, canAddBranch } from "@/server/plans/limits"
import type { ActionResult } from "@/server/result"

const UNAVAILABLE_OPERATOR = "Un des opérateurs choisis n'est pas activé pour votre entreprise."

export async function createBranch(ctx: ActorContext, input: CreateBranchInput): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  if (!authorize(ctx.actor, "branch:create").allowed) {
    return { ok: false, error: "Seul le propriétaire peut créer un point de vente." }
  }

  const plan = await getCurrentPlan(ctx)
  if (!canAddBranch(plan, await countActiveBranches(ctx))) {
    return { ok: false, error: `Votre formule ${PLAN_LABELS[plan]} ne permet pas d'ajouter un point de vente.` }
  }

  const branchId = randomUUID()
  let rows
  try {
    rows = buildBranchAccounts({
      organizationId: ctx.organizationId,
      branchId,
      memberId: ctx.actor.memberId,
      operators: input.operators,
      cash: input.cash,
      catalog: await listActiveOrgOperators(ctx),
      newId: randomUUID,
    })
  } catch (error) {
    if (error instanceof UnknownOperatorError) return { ok: false, error: UNAVAILABLE_OPERATOR }
    throw error
  }

  // Branch, accounts and opening lines: all or nothing.
  await ctx.db.$transaction(async (tx) => {
    await tx.branch.create({
      data: {
        id: branchId,
        organizationId: ctx.organizationId,
        name: input.branchName,
        address: input.branchAddress?.trim() || null,
      },
    })
    await tx.account.createMany({ data: rows.accounts })
    if (rows.ledgerEntries.length > 0) await tx.ledgerEntry.createMany({ data: rows.ledgerEntries })
  })

  await recordAudit(ctx, {
    action: "branch.create",
    entity: "Branch",
    entityId: branchId,
    branchId,
    after: { name: input.branchName, accounts: rows.accounts.length },
  })
  return { ok: true }
}

export async function addOperatorAccount(
  ctx: ActorContext,
  input: AddOperatorAccountInput,
): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  // The branch id comes from the client: it must belong to this organization.
  const branch = await ctx.db.branch.findFirst({ where: { id: input.branchId, isActive: true }, select: { id: true } })
  if (!branch) return { ok: false, error: "Point de vente introuvable." }
  if (!authorize(ctx.actor, "catalog:manage", { branchId: branch.id }).allowed) {
    return { ok: false, error: "Vous ne gérez pas ce point de vente." }
  }

  const existing = await ctx.db.account.findFirst({
    where: { branchId: branch.id, operatorId: input.operatorId },
    select: { id: true },
  })
  if (existing) return { ok: false, error: "Cet opérateur a déjà un compte dans ce point de vente." }

  let rows
  try {
    rows = buildBranchAccounts({
      organizationId: ctx.organizationId,
      branchId: branch.id,
      memberId: ctx.actor.memberId,
      operators: [input],
      catalog: await listActiveOrgOperators(ctx),
      newId: randomUUID,
    })
  } catch (error) {
    if (error instanceof UnknownOperatorError) return { ok: false, error: UNAVAILABLE_OPERATOR }
    throw error
  }

  await ctx.db.$transaction(async (tx) => {
    await tx.account.createMany({ data: rows.accounts })
    if (rows.ledgerEntries.length > 0) await tx.ledgerEntry.createMany({ data: rows.ledgerEntries })
  })

  await recordAudit(ctx, {
    action: "account.create",
    entity: "Account",
    entityId: rows.accounts[0].id,
    branchId: branch.id,
    after: { branchId: branch.id, operatorId: input.operatorId, openingBalance: input.openingBalance },
  })
  return { ok: true }
}

// Only the account number and the alert threshold change here. A balance is never edited:
// it moves through ledger lines only.
export async function updateAccount(ctx: ActorContext, input: UpdateAccountInput): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  const account = await ctx.db.account.findFirst({
    where: { id: input.accountId },
    select: { id: true, branchId: true, accountNumber: true, alertThreshold: true },
  })
  if (!account) return { ok: false, error: "Compte introuvable." }
  if (!authorize(ctx.actor, "catalog:manage", { branchId: account.branchId }).allowed) {
    return { ok: false, error: "Vous ne gérez pas ce point de vente." }
  }

  const accountNumber = input.accountNumber?.trim() || null
  await ctx.db.account.update({
    where: { id: account.id },
    data: { accountNumber, alertThreshold: input.alertThreshold },
  })

  await recordAudit(ctx, {
    action: "account.update",
    entity: "Account",
    entityId: account.id,
    branchId: account.branchId,
    before: { accountNumber: account.accountNumber, alertThreshold: account.alertThreshold },
    after: { accountNumber, alertThreshold: input.alertThreshold },
  })
  return { ok: true }
}
