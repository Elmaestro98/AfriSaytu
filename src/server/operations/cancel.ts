import { LedgerReason } from "@/generated/prisma/enums"
import type { CancelOperationInput } from "@/schemas/operation"
import type { ActorContext } from "@/server/auth/actor"
import { recordAudit } from "@/server/audit/log"
import { reversalPostings } from "@/server/ledger/postings"
import { planCancellation } from "@/server/operations/cancel-rules"
import type { ActionResult } from "@/server/result"
import { refuseWriteIfInactive } from "@/server/plans/current"

class AlreadyCancelledError extends Error {}

// Cancels a validated operation: it is never modified nor deleted. Its status becomes CANCELLED
// with the reason, and each of its ledger lines gets an opposite line (counter-entry), all in
// ONE SQL transaction. Both stay visible in the history.
export async function cancelOperation(ctx: ActorContext, input: CancelOperationInput, now = new Date()): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  const operation = await ctx.db.transaction.findFirst({
    where: { id: input.transactionId },
    select: { id: true, status: true, branchId: true, memberId: true, createdAt: true, closingId: true, amount: true, type: true },
  })
  if (!operation) return { ok: false, error: "Opération introuvable." }

  const plan = planCancellation(ctx.actor, operation, now)
  if (!plan.ok) return plan

  try {
    await ctx.db.$transaction(async (tx) => {
      // Only a VALID operation moves to CANCELLED: a second, simultaneous cancellation finds nothing.
      const updated = await tx.transaction.updateMany({
        where: { id: operation.id, status: "VALID" },
        data: { status: "CANCELLED", cancelReason: input.reason, cancelledById: ctx.actor.memberId, cancelledAt: now },
      })
      if (updated.count !== 1) throw new AlreadyCancelledError()

      const entries = await tx.ledgerEntry.findMany({
        where: { transactionId: operation.id, reason: LedgerReason.TRANSACTION },
        select: { id: true, accountId: true, delta: true },
      })
      await tx.ledgerEntry.createMany({
        data: reversalPostings(entries).map((posting) => ({
          organizationId: ctx.organizationId,
          accountId: posting.accountId,
          delta: posting.delta,
          reversalOfId: posting.reversalOfId,
          reason: LedgerReason.CANCELLATION,
          transactionId: operation.id,
          memberId: ctx.actor.memberId,
        })),
      })
    })
  } catch (error) {
    if (error instanceof AlreadyCancelledError) return { ok: false, error: "Cette opération est déjà annulée." }
    throw error
  }

  await recordAudit(ctx, {
    action: "transaction.cancel",
    entity: "Transaction",
    entityId: operation.id,
    branchId: operation.branchId,
    reason: input.reason,
    before: { status: "VALID", type: operation.type, amount: operation.amount },
    after: { status: "CANCELLED" },
  })
  return { ok: true }
}
