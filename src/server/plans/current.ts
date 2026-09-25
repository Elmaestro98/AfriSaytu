import type { SubscriptionPlan } from "@/generated/prisma/enums"
import type { ActorContext } from "@/server/auth/actor"
import type { TenantContext } from "@/server/db"
import { subscriptionState, writeRefusal, type SubscriptionState } from "@/server/plans/lifecycle"

// The plan in force is the latest subscription row (rows are kept for history).
export async function getCurrentPlan(ctx: ActorContext): Promise<SubscriptionPlan> {
  const subscription = await ctx.db.subscription.findFirst({
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  })
  return subscription?.plan ?? "BASIC"
}

export async function getSubscriptionState(ctx: Pick<TenantContext, "db">, now = new Date()): Promise<SubscriptionState> {
  const subscription = await ctx.db.subscription.findFirst({
    orderBy: { createdAt: "desc" },
    select: { status: true, trialEndsAt: true, currentPeriodEnd: true },
  })
  return subscriptionState(subscription, now)
}

// First line of every write: refuses it when the subscription is read only or suspended (F-62).
export async function refuseWriteIfInactive(ctx: Pick<TenantContext, "db">): Promise<{ ok: false; error: string } | null> {
  return writeRefusal(await getSubscriptionState(ctx))
}
