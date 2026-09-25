import type { SubscriptionStatus } from "@/generated/prisma/enums"

// Subscription life cycle (F-62), computed from the dates at each request: no nightly job that
// could silently fail. Trial or paid period -> 7 days of grace -> read only. SUSPENDED and a forced
// READ_ONLY are manual decisions of the SaaS admin and are never reached automatically.

export const GRACE_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

// FULL: everything works. READ_ONLY: history, statistics and exports only. BLOCKED: nothing.
export type Access = "FULL" | "READ_ONLY" | "BLOCKED"

export type SubscriptionState = {
  status: SubscriptionStatus // the effective status, which may be ahead of the stored one
  access: Access
  fromTrial: boolean // the period that ended (or runs) is the free trial
  deadline: Date | null // end of the current step (trial, paid period or grace); null = none
  daysLeft: number | null // whole days before the deadline, today counted
}

export type StoredSubscription = {
  status: SubscriptionStatus
  trialEndsAt: Date | null
  currentPeriodEnd: Date | null
}

function daysUntil(deadline: Date, now: Date): number {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS))
}

export function subscriptionState(subscription: StoredSubscription | null, now: Date): SubscriptionState {
  // Every organization gets a subscription at onboarding: none means something went wrong, so
  // keep the data readable without letting anyone work for free.
  if (!subscription) return { status: "READ_ONLY", access: "READ_ONLY", fromTrial: false, deadline: null, daysLeft: null }

  if (subscription.status === "SUSPENDED") {
    return { status: "SUSPENDED", access: "BLOCKED", fromTrial: false, deadline: null, daysLeft: null }
  }
  if (subscription.status === "READ_ONLY") {
    return { status: "READ_ONLY", access: "READ_ONLY", fromTrial: false, deadline: null, daysLeft: null }
  }

  const fromTrial = subscription.status === "TRIAL"
  const end = fromTrial ? subscription.trialEndsAt : subscription.currentPeriodEnd
  const running = fromTrial ? "TRIAL" : "ACTIVE"

  // No end date: a period granted without limit by the admin.
  if (!end) return { status: running, access: "FULL", fromTrial, deadline: null, daysLeft: null }

  if (now < end) return { status: running, access: "FULL", fromTrial, deadline: end, daysLeft: daysUntil(end, now) }

  const graceEnd = new Date(end.getTime() + GRACE_DAYS * DAY_MS)
  if (now < graceEnd) return { status: "PAST_DUE", access: "FULL", fromTrial, deadline: graceEnd, daysLeft: daysUntil(graceEnd, now) }

  return { status: "READ_ONLY", access: "READ_ONLY", fromTrial, deadline: null, daysLeft: null }
}

export const READ_ONLY_ERROR =
  "Votre abonnement a expiré : l'application est en lecture seule. Renouvelez l'abonnement pour enregistrer de nouvelles données."
export const SUSPENDED_ERROR = "Ce compte est suspendu. Contactez le support AfriSaytu."

// The refusal of a write, or null when writing is allowed.
export function writeRefusal(state: SubscriptionState): { ok: false; error: string } | null {
  if (state.access === "FULL") return null
  return { ok: false, error: state.access === "BLOCKED" ? SUSPENDED_ERROR : READ_ONLY_ERROR }
}
