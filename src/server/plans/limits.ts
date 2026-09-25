import type { SubscriptionPlan } from "@/generated/prisma/enums"

// Plan limits of the cahier des charges, section 13. null = unlimited.
export type PlanLimits = {
  maxBranches: number | null
  maxMembers: number | null
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  BASIC: { maxBranches: 1, maxMembers: 1 },
  PRO: { maxBranches: 1, maxMembers: 5 },
  BUSINESS: { maxBranches: 5, maxMembers: null }, // beyond 5 branches: on quote
}

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  BASIC: "Basic",
  PRO: "Pro",
  BUSINESS: "Business",
}

function underLimit(limit: number | null, current: number): boolean {
  return limit === null || current < limit
}

export function canAddBranch(plan: SubscriptionPlan, activeBranches: number): boolean {
  return underLimit(PLAN_LIMITS[plan].maxBranches, activeBranches)
}

export function canAddMember(plan: SubscriptionPlan, activeMembers: number): boolean {
  return underLimit(PLAN_LIMITS[plan].maxMembers, activeMembers)
}
