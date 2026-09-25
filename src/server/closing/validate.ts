import { LedgerReason } from "@/generated/prisma/enums"
import { cashCountTotal, cleanCashCount } from "@/lib/cash-count"
import { formatFCFA } from "@/lib/money"
import type { ValidateClosingInput } from "@/schemas/closing"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { recordAudit } from "@/server/audit/log"
import { planClosing } from "@/server/closing/compute"
import { loadPeriodAccounts } from "@/server/closing/queries"
import type { ActionResult } from "@/server/result"
import { refuseWriteIfInactive } from "@/server/plans/current"

class ClosingRejected extends Error {}

// Validates and locks the current day of a branch (F-41 to F-43), in ONE SQL transaction:
// the closing and its lines, one ADJUSTMENT ledger line per difference (so the counted balance
// becomes the next opening balance), and every operation of the period attached to the closing
// (an attached operation can no longer be cancelled).
export async function validateClosing(ctx: ActorContext, input: ValidateClosingInput, now = new Date()): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  const branch = await ctx.db.branch.findFirst({ where: { id: input.branchId, isActive: true }, select: { id: true } })
  if (!branch) return { ok: false, error: "Point de vente introuvable." }
  if (!authorize(ctx.actor, "closing:validate", { branchId: branch.id }).allowed) {
    return { ok: false, error: "Vous ne pouvez pas clôturer ce point de vente." }
  }

  const organization = await ctx.db.organization.findFirst({ select: { closingDiffThreshold: true } })
  const cashCount = cleanCashCount(input.cashCount)

  let totalDifference = 0
  try {
    await ctx.db.$transaction(async (tx) => {
      const period = await loadPeriodAccounts(tx, branch.id)
      if (period.previousClosingId !== input.previousClosingId) {
        throw new ClosingRejected("Une clôture vient d'être validée pour ce point de vente. Rechargez la page.")
      }

      // The cash drawer is always the total of the banknote and coin count, never a typed total.
      const cashIds = new Set(period.accounts.filter((account) => account.kind === "CASH").map((account) => account.id))
      const counted = input.lines.map((line) => (cashIds.has(line.accountId) ? { ...line, counted: cashCountTotal(cashCount) } : line))

      const plan = planClosing(period.accounts, counted, organization?.closingDiffThreshold ?? 0)
      if (!plan.ok) throw new ClosingRejected(plan.error)
      totalDifference = plan.totalDifference

      // Operations of the period, as read now. One entered meanwhile stays for the next period.
      const operations = await tx.transaction.findMany({ where: { branchId: branch.id, closingId: null }, select: { id: true } })

      const closing = await tx.dailyClosing.create({
        data: {
          organizationId: ctx.organizationId,
          branchId: branch.id,
          ...(period.since ? { openedAt: period.since } : {}),
          closedAt: now,
          closedById: ctx.actor.memberId,
          status: "CLOSED",
        },
        select: { id: true },
      })
      await tx.closingLine.createMany({
        data: plan.lines.map((line) => ({
          organizationId: ctx.organizationId,
          closingId: closing.id,
          ...line,
          ...(cashIds.has(line.accountId) ? { cashCount } : {}),
        })),
      })
      const adjustments = plan.lines.filter((line) => line.difference !== 0)
      if (adjustments.length > 0) {
        await tx.ledgerEntry.createMany({
          data: adjustments.map((line) => ({
            organizationId: ctx.organizationId,
            accountId: line.accountId,
            delta: line.difference,
            reason: LedgerReason.ADJUSTMENT,
            closingId: closing.id,
            memberId: ctx.actor.memberId,
          })),
        })
      }
      await tx.transaction.updateMany({
        where: { id: { in: operations.map((operation) => operation.id) } },
        data: { closingId: closing.id },
      })
    })
  } catch (error) {
    if (error instanceof ClosingRejected) return { ok: false, error: error.message }
    throw error
  }

  await recordAudit(ctx, {
    action: "closing.validate",
    entity: "DailyClosing",
    branchId: branch.id,
    after: { branchId: branch.id, totalDifference, formatted: formatFCFA(totalDifference) },
  })
  return { ok: true }
}
