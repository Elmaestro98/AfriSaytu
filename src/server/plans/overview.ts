import type { SubscriptionPlan } from "@/generated/prisma/enums"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { countActiveBranches } from "@/server/branches/queries"
import { getCurrentPlan, getSubscriptionState } from "@/server/plans/current"
import type { SubscriptionState } from "@/server/plans/lifecycle"
import { PLAN_LIMITS, type PlanLimits } from "@/server/plans/limits"

export class SubscriptionAccessError extends Error {}

export type SubscriptionOverview = {
  plan: SubscriptionPlan
  state: SubscriptionState
  limits: PlanLimits
  usage: { branches: number; members: number }
  payments: { id: string; createdAt: Date; amount: number; providerRef: string | null; status: "PENDING" | "PAID" | "FAILED"; plan: SubscriptionPlan | null; months: number | null }[]
}

// The subscription screen: the owner only (cahier 5, "Gérer l'abonnement").
export async function loadSubscriptionOverview(ctx: ActorContext, now = new Date()): Promise<SubscriptionOverview> {
  if (!authorize(ctx.actor, "subscription:manage").allowed) throw new SubscriptionAccessError()

  const [plan, state, branches, members, payments] = await Promise.all([
    getCurrentPlan(ctx),
    getSubscriptionState(ctx, now),
    countActiveBranches(ctx),
    ctx.db.member.count({ where: { isActive: true } }),
    ctx.db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, createdAt: true, amount: true, providerRef: true, status: true, plan: true, months: true },
    }),
  ])
  return { plan, state, limits: PLAN_LIMITS[plan], usage: { branches, members }, payments }
}
