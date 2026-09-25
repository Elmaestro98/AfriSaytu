import { Prisma } from "@/generated/prisma/client"
import type { DeclarePaymentInput } from "@/schemas/billing"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { recordAudit } from "@/server/audit/log"
import { getSubscriptionState } from "@/server/plans/current"
import { PLAN_LABELS, subscriptionPrice } from "@/server/plans/limits"
import { SUSPENDED_ERROR } from "@/server/plans/lifecycle"
import type { ActionResult } from "@/server/result"

export const WAVE_PROVIDER = "WAVE"

// The owner says "I paid with Wave": a PENDING payment the SaaS admin confirms after checking their
// Wave account. Allowed in read only (that is when one pays), not when suspended.
export async function declarePayment(ctx: ActorContext, input: DeclarePaymentInput): Promise<ActionResult> {
  if (!authorize(ctx.actor, "subscription:manage").allowed) {
    return { ok: false, error: "Seul le propriétaire peut payer l'abonnement." }
  }
  if ((await getSubscriptionState(ctx)).access === "BLOCKED") return { ok: false, error: SUSPENDED_ERROR }

  const pending = await ctx.db.payment.count({ where: { status: "PENDING" } })
  if (pending > 0) return { ok: false, error: "Un paiement est déjà en attente de confirmation." }

  const amount = subscriptionPrice(input.plan, input.months) // never the amount sent by the browser
  try {
    const payment = await ctx.db.payment.create({
      data: {
        organizationId: ctx.organizationId,
        amount,
        provider: WAVE_PROVIDER,
        providerRef: input.providerRef,
        plan: input.plan,
        months: input.months,
        status: "PENDING",
      },
      select: { id: true },
    })
    await recordAudit(ctx, {
      action: "subscription.paymentDeclared",
      entity: "Payment",
      entityId: payment.id,
      after: { plan: input.plan, months: input.months, amount, providerRef: input.providerRef, label: PLAN_LABELS[input.plan] },
    })
    return { ok: true }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Cette référence Wave a déjà été déclarée." }
    }
    throw error
  }
}
