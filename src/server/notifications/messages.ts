import { formatFCFA } from "@/lib/money"

// Texts of the push notifications (pure). They show on a locked screen: amounts yes (the owner's
// choice), customer numbers never.

export type PushMessage = { title: string; body: string; url: string; tag: string }

const signed = (amount: number) => `${amount > 0 ? "+" : ""}${formatFCFA(amount)}`
const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`

export function lowBalanceMessage(input: { accountId: string; accountLabel: string; branchName: string; balance: number; threshold: number }): PushMessage {
  return {
    title: `Solde bas : ${input.accountLabel}`,
    body: `${formatFCFA(input.balance)} (seuil ${formatFCFA(input.threshold)}) · ${input.branchName}. Pensez à approvisionner.`,
    url: "/cash",
    tag: `low-balance-${input.accountId}`,
  }
}

export function liquidityMessage(input: { accountId: string; accountLabel: string; branchName: string; hour: string }): PushMessage {
  return {
    title: `${input.accountLabel} : épuisé vers ${input.hour}`,
    body: `À ce rythme, ce solde sera à zéro vers ${input.hour} · ${input.branchName}. Pensez à approvisionner.`,
    url: "/cash",
    tag: `liquidity-${input.accountId}`,
  }
}

export function tierReachedMessage(input: { operatorName: string; branchName: string; number: number; commission: number }): PushMessage {
  return {
    title: `${input.operatorName} : palier ${input.number} atteint 🎉`,
    body: `Commission du jour : ${formatFCFA(input.commission)} · ${input.branchName}.`,
    url: "/dashboard",
    tag: `tier-${input.operatorName}-${input.branchName}`,
  }
}

export function tierNearMessage(input: { operatorName: string; branchName: string; number: number; missing: number; commission: number }): PushMessage {
  return {
    title: `${input.operatorName} : palier ${input.number} en vue 🎯`,
    body: `Encore ${formatFCFA(input.missing)} de dépôts et retraits pour ${formatFCFA(input.commission)} de commission du jour · ${input.branchName}.`,
    url: "/dashboard",
    tag: `tier-${input.operatorName}-${input.branchName}`,
  }
}

export function closingReminderMessage(input: { branchId: string; branchName: string; pending: number }): PushMessage {
  return {
    title: "Journée non clôturée",
    body: `${input.branchName} : ${plural(input.pending, "opération")} en attente. Comptez la caisse et clôturez la journée.`,
    url: "/closing",
    tag: `closing-reminder-${input.branchId}`,
  }
}

export function closingGapMessage(input: { closingId: string; branchName: string; authorName: string | null; lines: readonly { label: string; difference: number }[] }): PushMessage {
  const gaps = input.lines.filter((line) => line.difference !== 0)
  const total = gaps.reduce((sum, line) => sum + line.difference, 0)
  const detail = gaps.slice(0, 3).map((line) => `${line.label} ${signed(line.difference)}`).join(", ")
  return {
    title: `Écart de clôture : ${signed(total)}`,
    body: `${input.branchName}${input.authorName ? ` · validée par ${input.authorName}` : ""}. ${detail}${gaps.length > 3 ? "…" : "."}`,
    url: "/closing",
    tag: `closing-gap-${input.closingId}`,
  }
}

export function subscriptionMessage(input: { daysLeft: number; stage: "TRIAL" | "ACTIVE" | "PAST_DUE" }): PushMessage {
  const days = input.daysLeft > 1 ? `dans ${input.daysLeft} jours` : "demain"
  const title = input.stage === "TRIAL" ? `Votre essai gratuit se termine ${days}` : input.stage === "PAST_DUE" ? `Période de grâce : fin ${days}` : `Votre abonnement se termine ${days}`
  return {
    title,
    body: "Renouvelez depuis Réglages → Mon abonnement pour continuer à enregistrer vos opérations.",
    url: "/settings/subscription",
    tag: "subscription",
  }
}

export function testMessage(): PushMessage {
  return { title: "AfriSaytu", body: "Les notifications fonctionnent sur cet appareil ✅", url: "/settings/notifications", tag: "test" }
}
