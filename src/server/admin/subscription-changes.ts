import type { SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/enums"
import { addCalendarMonths } from "@/lib/dates"

// Pure: what the SaaS admin does to a subscription (F-63). Every change is a NEW subscription row
// (the history is kept, the latest row is in force); the previous row is never edited.

const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_EXTENSION_DAYS = 90
export const MAX_PAID_MONTHS = 24

export type CurrentSubscription = {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
}

export type NextSubscription = CurrentSubscription
export type Change = { ok: true; next: NextSubscription } | { ok: false; error: string }

const SUSPENDED = "Le compte est suspendu : réactivez-le d'abord."

// A later end never goes back: extending counts from the current end when it is still ahead.
function from(end: Date | null, now: Date): Date {
  return end && end > now ? end : now
}

export function extendTrial(current: CurrentSubscription, days: number, now: Date): Change {
  if (!Number.isInteger(days) || days < 1 || days > MAX_EXTENSION_DAYS) {
    return { ok: false, error: `Entre 1 et ${MAX_EXTENSION_DAYS} jours.` }
  }
  if (current.status === "SUSPENDED") return { ok: false, error: SUSPENDED }
  if (current.currentPeriodEnd) return { ok: false, error: "Ce client a déjà payé : enregistrez plutôt un paiement." }
  return { ok: true, next: { ...current, status: "TRIAL", trialEndsAt: new Date(from(current.trialEndsAt, now).getTime() + days * DAY_MS) } }
}

// A payment received by hand (Wave, Orange Money…) before online payment exists.
export function applyPayment(current: CurrentSubscription, months: number, now: Date): Change {
  if (!Number.isInteger(months) || months < 1 || months > MAX_PAID_MONTHS) {
    return { ok: false, error: `Entre 1 et ${MAX_PAID_MONTHS} mois.` }
  }
  if (current.status === "SUSPENDED") return { ok: false, error: SUSPENDED }
  return { ok: true, next: { ...current, status: "ACTIVE", currentPeriodEnd: addCalendarMonths(from(current.currentPeriodEnd, now), months) } }
}

export function changePlan(current: CurrentSubscription, plan: SubscriptionPlan): Change {
  if (plan === current.plan) return { ok: false, error: "Le client a déjà cette formule." }
  return { ok: true, next: { ...current, plan } }
}

export function suspend(current: CurrentSubscription): Change {
  if (current.status === "SUSPENDED") return { ok: false, error: "Le compte est déjà suspendu." }
  return { ok: true, next: { ...current, status: "SUSPENDED" } }
}

// Back to the status the dates give: trial, paid, grace or read only (plans/lifecycle).
export function reactivate(current: CurrentSubscription): Change {
  if (current.status !== "SUSPENDED" && current.status !== "READ_ONLY") {
    return { ok: false, error: "Le compte n'est ni suspendu ni bloqué en lecture seule." }
  }
  // The stored status only records the kind of period; the effective one comes from the dates.
  const status: SubscriptionStatus = current.currentPeriodEnd ? "ACTIVE" : "TRIAL"
  return { ok: true, next: { ...current, status } }
}
