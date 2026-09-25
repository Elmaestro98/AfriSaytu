import type { TransactionType } from "@/generated/prisma/enums"
import { formatFCFA } from "@/lib/money"

// Pure: daily-volume commission (operators in DAILY_VOLUME mode, e.g. Wave). For one branch, one
// operator and one Dakar day, the total of valid deposits + withdrawals falls in one tier of the
// operator's scale, and that tier's commission is the commission of the day. Other types are
// excluded from the total.

export const DAILY_VOLUME_TYPES: readonly TransactionType[] = ["DEPOSIT", "WITHDRAWAL"]

export type Tier = { minAmount: number; maxAmount: number | null; commission: number }

export type TierCheck = { ok: true; tiers: Tier[] } | { ok: false; error: string }

const MAX_TIERS = 50

// A scale is valid when its tiers follow each other with neither gap nor overlap (each one starts
// at the previous maximum + 1), in whole francs; only the last one may be open ("and above").
export function checkTiers(input: readonly Tier[]): TierCheck {
  if (input.length === 0) return { ok: false, error: "Ajoutez au moins un palier." }
  if (input.length > MAX_TIERS) return { ok: false, error: `${MAX_TIERS} paliers au maximum.` }
  const tiers = [...input].sort((a, b) => a.minAmount - b.minAmount)

  for (const [index, tier] of tiers.entries()) {
    const line = `Palier ${index + 1}`
    const whole = [tier.minAmount, tier.commission, ...(tier.maxAmount === null ? [] : [tier.maxAmount])]
    if (!whole.every((value) => Number.isSafeInteger(value) && value >= 0)) return { ok: false, error: `${line} : montants en francs entiers.` }
    const last = index === tiers.length - 1
    if (tier.maxAmount === null && !last) return { ok: false, error: `${line} : seul le dernier palier peut être sans maximum.` }
    if (tier.maxAmount !== null && tier.maxAmount < tier.minAmount) return { ok: false, error: `${line} : le maximum est inférieur au minimum.` }
    const previous = tiers[index - 1]
    if (previous && previous.maxAmount !== null && tier.minAmount !== previous.maxAmount + 1) {
      return {
        ok: false,
        error: tier.minAmount <= previous.maxAmount
          ? `${line} : il chevauche le palier précédent.`
          : `${line} : il doit commencer à ${formatFCFA(previous.maxAmount + 1)}, juste après le palier précédent.`,
      }
    }
  }
  return { ok: true, tiers }
}

export type DailyCommission = {
  volume: number
  commission: number
  tier: Tier | null // the tier reached; null below the first one or above the last one
  next: { tier: Tier; missing: number } | null // the next tier and how much volume it still needs
}

export function dailyCommission(scale: readonly Tier[], volume: number): DailyCommission {
  const tiers = [...scale].sort((a, b) => a.minAmount - b.minAmount)
  const index = tiers.findIndex((tier) => volume >= tier.minAmount && (tier.maxAmount === null || volume <= tier.maxAmount))
  const tier = index >= 0 ? tiers[index] : null
  const upcoming = tier ? tiers[index + 1] : tiers.find((candidate) => candidate.minAmount > volume)
  return {
    volume,
    commission: tier?.commission ?? 0,
    tier,
    next: upcoming ? { tier: upcoming, missing: upcoming.minAmount - volume } : null,
  }
}

// The tiers in force at an instant: a past day uses the scale of that day, never today's.
export function tiersInForce<T extends { validFrom: Date; validTo: Date | null }>(rows: readonly T[], at: Date): T[] {
  return rows.filter((row) => row.validFrom <= at && (row.validTo === null || row.validTo > at))
}

// Commission of one operation of a DAILY_VOLUME operator: deposits and withdrawals earn nothing on
// their own (the day's total does); never flagged "sans règle". Other types keep their rule if any.
export function perOperationQuote<Q extends { commissionRuleId: string | null; commission: number; noRule: boolean }>(
  quote: Q,
  type: TransactionType,
): Q {
  if (DAILY_VOLUME_TYPES.includes(type)) return { ...quote, commissionRuleId: null, commission: 0, noRule: false }
  return quote.noRule ? { ...quote, noRule: false } : quote
}
