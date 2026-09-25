import { Prisma } from "@/generated/prisma/client"
import { LedgerReason } from "@/generated/prisma/enums"
import { formatFCFA } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import type { CreateOperationInput } from "@/schemas/operation"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { computeEntry } from "@/server/operations/compute-entry"
import { loadEntryContext } from "@/server/operations/entry-context"
import { refuseWriteIfInactive } from "@/server/plans/current"

export const DUPLICATE_WINDOW_MS = 3 * 60_000

export type CreateOperationResult =
  | { ok: true; transactionId: string; message: string; warning: string | null }
  | { ok: false; error: string; duplicate?: boolean }

function isUniqueViolation(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false
  return JSON.stringify(error.meta ?? {}).includes(field)
}

// Records a customer operation: the operation and its ledger lines in ONE SQL transaction.
// Everything is recomputed here; nothing computed by the browser is trusted.
export async function createOperation(ctx: ActorContext, input: CreateOperationInput): Promise<CreateOperationResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  // A network retry of an operation already recorded: answer success without writing twice.
  const replay = await ctx.db.transaction.findFirst({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true },
  })
  if (replay) return { ok: true, transactionId: replay.id, message: "Opération déjà enregistrée.", warning: null }

  if (!authorize(ctx.actor, "transaction:create", { branchId: input.branchId }).allowed) {
    return { ok: false, error: "Vous ne pouvez pas saisir d'opération dans ce point de vente." }
  }

  const now = new Date()
  const entry = await loadEntryContext(ctx, now)
  const branch = entry.branches.find((item) => item.id === input.branchId)
  const operator = branch?.operators.find((item) => item.id === input.operatorId)
  if (!branch || !operator) return { ok: false, error: "Cet opérateur n'est pas disponible dans ce point de vente." }

  if (input.commission !== null && !entry.allowManualCommission) {
    return { ok: false, error: "La saisie manuelle de la commission n'est pas autorisée." }
  }

  const result = computeEntry(
    { ...input, manual: input.type === "OTHER" ? input.manual : null },
    {
      rules: entry.rules,
      roundingMode: entry.roundingMode,
      effect: operator.effects[input.type],
      allowManualCommission: entry.allowManualCommission,
      at: now,
    },
    { uvAccountId: operator.uvAccountId, cashAccountId: branch.cashAccountId, uvBalance: operator.uvBalance, cashBalance: branch.cashBalance },
  )

  if (result.goesNegative.length > 0 && entry.blockNegativeBalance) {
    return { ok: false, error: "Solde insuffisant : cette opération rendrait un solde négatif." }
  }

  // Same operator, type and amount in the last 3 minutes. With a customer number: that
  // number, whoever entered it. Without: the same agent.
  if (!input.confirmDuplicate) {
    const duplicate = await ctx.db.transaction.findFirst({
      where: {
        status: "VALID",
        operatorId: input.operatorId,
        type: input.type,
        amount: input.amount,
        createdAt: { gte: new Date(now.getTime() - DUPLICATE_WINDOW_MS) },
        ...(input.customerPhone ? { customerPhone: input.customerPhone } : { customerPhone: null, memberId: ctx.actor.memberId }),
      },
      select: { id: true },
    })
    if (duplicate) {
      return { ok: false, duplicate: true, error: "Une opération identique a été saisie il y a moins de 3 minutes." }
    }
  }

  if (input.reference) {
    const taken = await ctx.db.transaction.findFirst({
      // Only valid operations hold a reference: a cancelled one frees it for the corrected entry.
      where: { operatorId: input.operatorId, reference: input.reference, status: "VALID" },
      select: { id: true },
    })
    if (taken) return { ok: false, error: "Cette référence est déjà enregistrée pour cet opérateur." }
  }

  try {
    const created = await ctx.db.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          organizationId: ctx.organizationId,
          branchId: branch.id,
          memberId: ctx.actor.memberId,
          operatorId: operator.id,
          type: input.type,
          amount: input.amount,
          fee: result.fee,
          feeInCash: input.feeInCash,
          commission: result.commission,
          commissionRuleId: result.quote.commissionRuleId, // frozen: a later rule change never recomputes it
          noRule: result.quote.noRule,
          feeManual: result.feeManual,
          commissionManual: result.commissionManual,
          customerPhone: input.customerPhone,
          reference: input.reference,
          note: input.note,
          idempotencyKey: input.idempotencyKey,
          clientCreatedAt: input.clientCreatedAt ? new Date(input.clientCreatedAt) : null,
        },
        select: { id: true },
      })
      await tx.ledgerEntry.createMany({
        data: result.postings.map((posting) => ({
          organizationId: ctx.organizationId,
          accountId: posting.accountId,
          reason: LedgerReason.TRANSACTION,
          delta: posting.delta,
          transactionId: transaction.id,
          memberId: ctx.actor.memberId,
        })),
      })
      return transaction
    })

    const label = `${TYPE_LABELS[input.type]} ${operator.name} de ${formatFCFA(input.amount)} enregistré`
    return {
      ok: true,
      transactionId: created.id,
      message: result.quote.noRule ? `${label} (sans règle de commission).` : `${label}. Commission ${formatFCFA(result.commission)}.`,
      warning: result.goesNegative.length > 0 ? "Attention : un solde est maintenant négatif." : null,
    }
  } catch (error) {
    // Two identical requests at the same time: the other one has recorded it.
    if (isUniqueViolation(error, "idempotencyKey")) {
      return { ok: true, transactionId: "", message: "Opération déjà enregistrée.", warning: null }
    }
    if (isUniqueViolation(error, "reference")) {
      return { ok: false, error: "Cette référence est déjà enregistrée pour cet opérateur." }
    }
    throw error
  }
}
