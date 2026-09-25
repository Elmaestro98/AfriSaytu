import type { PrismaClient } from "@/generated/prisma/client"
import { formatFCFA } from "@/lib/money"
import { snapshot } from "@/server/admin/commands"
import { applyPayment } from "@/server/admin/subscription-changes"
import type { ActionResult } from "@/server/result"

// Wave payments declared by owners, confirmed or refused by the SaaS admin after checking the
// Wave account (F-60, until an aggregator confirms payments automatically).

class AlreadyHandled extends Error {}
const ALREADY_HANDLED = "Ce paiement n'est plus en attente."

export type PendingPayment = {
  id: string
  organizationId: string
  organizationName: string
  createdAt: Date
  amount: number
  providerRef: string | null
  plan: string | null
  months: number | null
}

export async function listPendingPayments(db: PrismaClient, organizationId?: string): Promise<PendingPayment[]> {
  const rows = await db.payment.findMany({
    where: { status: "PENDING", ...(organizationId ? { organizationId } : {}) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      organizationId: true,
      createdAt: true,
      amount: true,
      providerRef: true,
      plan: true,
      months: true,
      organization: { select: { name: true } },
    },
  })
  return rows.map(({ organization, ...row }) => ({ ...row, organizationName: organization.name }))
}

// In ONE SQL transaction: new subscription row (paid period + plan paid for), payment PAID and
// linked to it, audit line in the client's journal. Confirming twice is impossible: the payment
// only leaves PENDING once, otherwise everything is rolled back.
export async function confirmPayment(db: PrismaClient, adminUserId: string, paymentId: string, now = new Date()): Promise<ActionResult> {
  try {
    return await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { organizationId: true, status: true, plan: true, months: true, amount: true, providerRef: true },
      })
      if (!payment || payment.status !== "PENDING") return { ok: false, error: ALREADY_HANDLED }
      if (!payment.plan || !payment.months) return { ok: false, error: "Paiement incomplet : refusez-le et enregistrez-le à la main." }

      const current = await tx.subscription.findFirst({
        where: { organizationId: payment.organizationId },
        orderBy: { createdAt: "desc" },
        select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
      })
      if (!current) return { ok: false, error: "Ce client n'a pas d'abonnement." }

      const change = applyPayment(current, payment.months, now)
      if (!change.ok) return change
      const next = { ...change.next, plan: payment.plan }

      const created = await tx.subscription.create({ data: { organizationId: payment.organizationId, ...next }, select: { id: true } })
      const updated = await tx.payment.updateMany({
        where: { id: paymentId, status: "PENDING" },
        data: { status: "PAID", paidAt: now, subscriptionId: created.id },
      })
      if (updated.count !== 1) throw new AlreadyHandled()

      await tx.auditLog.create({
        data: {
          organizationId: payment.organizationId,
          memberId: null,
          action: "subscription.payment",
          entity: "Subscription",
          entityId: created.id,
          reason: `${formatFCFA(payment.amount)} pour ${payment.months} mois (Wave ${payment.providerRef ?? "sans référence"})`,
          before: snapshot(current),
          after: { ...(snapshot(next) as Record<string, unknown>), adminUserId, paymentId },
        },
      })
      return { ok: true }
    })
  } catch (error) {
    if (error instanceof AlreadyHandled) return { ok: false, error: ALREADY_HANDLED }
    throw error
  }
}

// The money did not arrive: the payment is marked FAILED, the reason goes to the client's journal.
export async function refusePayment(db: PrismaClient, adminUserId: string, paymentId: string, reason: string): Promise<ActionResult> {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, select: { organizationId: true, amount: true, providerRef: true } })
    if (!payment) return { ok: false, error: ALREADY_HANDLED }
    const updated = await tx.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED" } })
    if (updated.count !== 1) return { ok: false, error: ALREADY_HANDLED }

    await tx.auditLog.create({
      data: {
        organizationId: payment.organizationId,
        memberId: null,
        action: "subscription.paymentRefused",
        entity: "Payment",
        entityId: paymentId,
        reason,
        after: { amount: payment.amount, providerRef: payment.providerRef, adminUserId },
      },
    })
    return { ok: true }
  })
}
