import { isMonthKey, monthKey, shiftMonth } from "@/lib/dates"

// Pure checks of a commission payout (F-55): who paid, for which month, received where.

const MAX_MONTHS_BACK = 12

export type PayoutInput = {
  operatorId: string | null | undefined
  payoutMonth: string | null | undefined
  accountOperatorId: string | null // operator of the receiving account; null for the cash drawer
}

export type PayoutCheck = { ok: true; operatorId: string; payoutMonth: string } | { ok: false; error: string }

export function checkPayout(input: PayoutInput, now: Date): PayoutCheck {
  if (!input.operatorId) return { ok: false, error: "Choisissez l'opérateur qui verse la commission." }
  if (!input.payoutMonth || !isMonthKey(input.payoutMonth)) return { ok: false, error: "Choisissez le mois couvert par ce versement." }
  const current = monthKey(now)
  if (input.payoutMonth > current) return { ok: false, error: "Le mois couvert ne peut pas être dans le futur." }
  if (input.payoutMonth < shiftMonth(current, -MAX_MONTHS_BACK)) return { ok: false, error: "Le mois couvert remonte à plus d'un an." }
  if (input.accountOperatorId && input.accountOperatorId !== input.operatorId) {
    return { ok: false, error: "Ce compte appartient à un autre opérateur : choisissez son compte, ou la caisse." }
  }
  return { ok: true, operatorId: input.operatorId, payoutMonth: input.payoutMonth }
}

// The month a payout covers by default: operators pay once a month for the previous month.
export function defaultPayoutMonth(now: Date): string {
  return shiftMonth(monthKey(now), -1)
}
