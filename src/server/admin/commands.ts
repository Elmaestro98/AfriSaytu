import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { formatFCFA } from "@/lib/money"
import {
  applyPayment,
  changePlan,
  extendTrial,
  reactivate,
  suspend,
  type Change,
  type CurrentSubscription,
} from "@/server/admin/subscription-changes"
import type { ActionResult } from "@/server/result"

// Write side of the SaaS admin console. Each command, in ONE SQL transaction: reads the
// subscription in force, applies the pure rule, inserts the new subscription row (and the payment),
// and journals it in the CLIENT's audit log, so the owner sees what the support did (F-63).

export type AdminCommand =
  | { kind: "extendTrial"; days: number; reason: string }
  | { kind: "payment"; months: number; amount: number; provider: string; providerRef: string | null }
  | { kind: "plan"; plan: CurrentSubscription["plan"]; reason: string }
  | { kind: "suspend"; reason: string }
  | { kind: "reactivate"; reason: string }

function decide(command: AdminCommand, current: CurrentSubscription, now: Date): Change {
  switch (command.kind) {
    case "extendTrial":
      return extendTrial(current, command.days, now)
    case "payment":
      return applyPayment(current, command.months, now)
    case "plan":
      return changePlan(current, command.plan)
    case "suspend":
      return suspend(current)
    case "reactivate":
      return reactivate(current)
  }
}

function reasonOf(command: AdminCommand): string {
  if (command.kind === "payment") return `${formatFCFA(command.amount)} pour ${command.months} mois`
  return command.reason
}

// A subscription as stored in the audit log (dates as text).
export function snapshot(value: CurrentSubscription): Prisma.InputJsonValue {
  return {
    plan: value.plan,
    status: value.status,
    trialEndsAt: value.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: value.currentPeriodEnd?.toISOString() ?? null,
  }
}

export async function runAdminCommand(
  db: PrismaClient,
  adminUserId: string,
  organizationId: string,
  command: AdminCommand,
  now = new Date(),
): Promise<ActionResult> {
  return db.$transaction(async (tx) => {
    const current = await tx.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
    })
    if (!current) return { ok: false, error: "Ce client n'a pas d'abonnement." }

    const change = decide(command, current, now)
    if (!change.ok) return change

    const created = await tx.subscription.create({ data: { organizationId, ...change.next }, select: { id: true } })
    if (command.kind === "payment") {
      await tx.payment.create({
        data: {
          organizationId,
          subscriptionId: created.id,
          amount: command.amount,
          provider: command.provider,
          providerRef: command.providerRef,
          status: "PAID",
          paidAt: now,
        },
      })
    }

    await tx.auditLog.create({
      data: {
        organizationId,
        memberId: null,
        action: `subscription.${command.kind}`,
        entity: "Subscription",
        entityId: created.id,
        reason: reasonOf(command),
        before: snapshot(current),
        after: { ...(snapshot(change.next) as Record<string, unknown>), adminUserId } as Prisma.InputJsonValue,
      },
    })
    return { ok: true }
  })
}
