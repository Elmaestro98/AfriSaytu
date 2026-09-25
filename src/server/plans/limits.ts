import type { SubscriptionPlan } from "@/generated/prisma/enums"
import { dayKey } from "@/lib/dates"

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

// Monthly prices of the cahier des charges, section 13. Indicative: the final prices are set after
// the pilot. A yearly payment gets 2 months free.
export const PLAN_MONTHLY_PRICE: Record<SubscriptionPlan, number> = {
  BASIC: 2_500,
  PRO: 5_000,
  BUSINESS: 10_000,
}

export const FREE_MONTHS_PER_YEAR = 2

export function yearlyPrice(plan: SubscriptionPlan): number {
  return PLAN_MONTHLY_PRICE[plan] * (12 - FREE_MONTHS_PER_YEAR)
}

// What each plan includes, as shown on the subscription screen (section 13).
export const PLAN_FEATURES: Record<SubscriptionPlan, readonly string[]> = {
  BASIC: ["Saisie, commissions, historique", "Caisse et clôture", "Tous les opérateurs", "Historique sur 3 mois"],
  PRO: ["Tout le plan Basic", "Export CSV et Excel", "Rapports PDF et rapprochement des commissions", "Historique sur 24 mois"],
  BUSINESS: ["Tout le plan Pro", "Plusieurs points de vente", "Permissions avancées", "Historique illimité"],
}

// Months of operation history a plan shows (section 13). null = everything. Older operations are
// hidden, never deleted: upgrading shows them again. Balances always use the whole ledger.
export const PLAN_HISTORY_MONTHS: Record<SubscriptionPlan, number | null> = {
  BASIC: 3,
  PRO: 24,
  BUSINESS: null,
}

// First visible instant: Dakar midnight, the same day `months` months ago, clamped to the end of
// a shorter month (31 May - 3 months = 28 or 29 February). Dakar is UTC+0 all year.
export function historyStart(plan: SubscriptionPlan, now: Date): Date | null {
  const months = PLAN_HISTORY_MONTHS[plan]
  if (months === null) return null
  const [year, month, day] = dayKey(now).split("-").map(Number)
  const target = new Date(Date.UTC(year, month - 1 - months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)))
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
