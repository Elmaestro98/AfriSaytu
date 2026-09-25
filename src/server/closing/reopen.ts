import { LedgerReason } from "@/generated/prisma/enums"
import type { ReopenClosingInput } from "@/schemas/closing"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { recordAudit } from "@/server/audit/log"
import { lastClosedClosing } from "@/server/closing/queries"
import { reversalPostings } from "@/server/ledger/postings"
import type { ActionResult } from "@/server/result"
import { refuseWriteIfInactive } from "@/server/plans/current"

class AlreadyReopened extends Error {}

// Reopens the latest closing of a branch (F-44), with a reason, in ONE SQL transaction: the
// closing becomes REOPENED (kept for history), its adjustment lines get counter-entries, and its
// operations are detached (they can be cancelled again). The day is then closed again.
export async function reopenClosing(ctx: ActorContext, input: ReopenClosingInput): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  const closing = await ctx.db.dailyClosing.findFirst({
    where: { id: input.closingId },
    select: { id: true, branchId: true, status: true },
  })
  if (!closing) return { ok: false, error: "Clôture introuvable." }
  if (!authorize(ctx.actor, "closing:reopen", { branchId: closing.branchId }).allowed) {
    return { ok: false, error: "Seul le gérant ou le propriétaire peut rouvrir une clôture." }
  }
  if (closing.status !== "CLOSED") return { ok: false, error: "Cette clôture n'est pas verrouillée." }

  const latest = await lastClosedClosing(ctx.db, closing.branchId)
  if (latest?.id !== closing.id) {
    return { ok: false, error: "Seule la dernière clôture de ce point de vente peut être rouverte." }
  }

  try {
    await ctx.db.$transaction(async (tx) => {
      const updated = await tx.dailyClosing.updateMany({
        where: { id: closing.id, status: "CLOSED" },
        data: { status: "REOPENED" },
      })
      if (updated.count !== 1) throw new AlreadyReopened()

      const adjustments = await tx.ledgerEntry.findMany({
        where: { closingId: closing.id, reason: LedgerReason.ADJUSTMENT },
        select: { id: true, accountId: true, delta: true },
      })
      if (adjustments.length > 0) {
        await tx.ledgerEntry.createMany({
          data: reversalPostings(adjustments).map((posting) => ({
            organizationId: ctx.organizationId,
            accountId: posting.accountId,
            delta: posting.delta,
            reversalOfId: posting.reversalOfId,
            reason: LedgerReason.CANCELLATION,
            closingId: closing.id,
            memberId: ctx.actor.memberId,
          })),
        })
      }
      await tx.transaction.updateMany({ where: { closingId: closing.id }, data: { closingId: null } })
    })
  } catch (error) {
    if (error instanceof AlreadyReopened) return { ok: false, error: "Cette clôture vient déjà d'être rouverte." }
    throw error
  }

  await recordAudit(ctx, {
    action: "closing.reopen",
    entity: "DailyClosing",
    entityId: closing.id,
    branchId: closing.branchId,
    reason: input.reason,
    before: { status: "CLOSED" },
    after: { status: "REOPENED" },
  })
  return { ok: true }
}
