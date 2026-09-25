import type { SubscriptionState } from "@/server/plans/lifecycle"

// Pure: the message of the subscription banner shown above every screen, or null when there is
// nothing to say (paid and running). Only the owner can pay (cahier 5): the others are told who to
// warn.

export type Banner = { tone: "info" | "warning" | "danger"; text: string }

function days(count: number): string {
  return `${count} jour${count > 1 ? "s" : ""}`
}

export function subscriptionBanner(state: SubscriptionState, isOwner: boolean): Banner | null {
  const tellOwner = isOwner ? "" : " Prévenez le propriétaire."
  switch (state.status) {
    case "TRIAL":
      return state.daysLeft === null ? null : { tone: "info", text: `Essai gratuit : ${days(state.daysLeft)} restant${state.daysLeft > 1 ? "s" : ""}.` }
    case "PAST_DUE": {
      const lead = state.fromTrial ? "Votre essai gratuit est terminé." : "Le paiement de l'abonnement est en retard."
      const left = state.daysLeft === null ? "" : ` Encore ${days(state.daysLeft)} avant le passage en lecture seule.`
      return { tone: "warning", text: `${lead}${left}${tellOwner}` }
    }
    case "READ_ONLY":
      return { tone: "danger", text: `Abonnement expiré : lecture seule. Vous pouvez consulter et exporter vos données, mais plus rien enregistrer.${tellOwner}` }
    default:
      return null // ACTIVE; SUSPENDED gets its own full screen
  }
}

export const STATUS_LABELS: Record<SubscriptionState["status"], string> = {
  TRIAL: "Essai gratuit",
  ACTIVE: "Actif",
  PAST_DUE: "Paiement en retard",
  READ_ONLY: "Lecture seule",
  SUSPENDED: "Suspendu",
}

// The line under the status on the subscription screen, or null when there is no date to give.
export function deadlineLine(state: SubscriptionState, formatDate: (date: Date) => string): string | null {
  if (!state.deadline) return null
  const date = formatDate(state.deadline)
  switch (state.status) {
    case "TRIAL":
      return `Fin de l'essai le ${date}`
    case "ACTIVE":
      return `Prochaine échéance le ${date}`
    case "PAST_DUE":
      return `Passage en lecture seule le ${date}`
    default:
      return null
  }
}

// After a trial nothing was ever billed: "late payment" would be wrong.
export function statusLabel(state: SubscriptionState): string {
  return state.status === "PAST_DUE" && state.fromTrial ? "Essai terminé" : STATUS_LABELS[state.status]
}
