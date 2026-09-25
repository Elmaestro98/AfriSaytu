import type { SubscriptionPlan } from "@/generated/prisma/enums"
import type { ActorContext } from "@/server/auth/actor"

// The plan in force is the latest subscription row (rows are kept for history).
export async function getCurrentPlan(ctx: ActorContext): Promise<SubscriptionPlan> {
  const subscription = await ctx.db.subscription.findFirst({
    orderBy: { createdAt: "desc" },
    select: { plan: true },
  })
  return subscription?.plan ?? "BASIC"
}
