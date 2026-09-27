import { dailyCommission, type Tier } from "@/server/commissions/daily"

// When a notification is due (pure).

// "Palier en vue" when what is missing is at most this share of the gap between the tier reached
// and the next one (the owner's choice: it adapts to small and large tiers).
export const NEAR_PERCENT = 20

export type TierEvent =
  | { kind: "reached"; number: number; commission: number } // number: 1 for the lowest tier
  | { kind: "near"; number: number; missing: number; commission: number } // about the next tier

// What an operation changed for the day's commission: from `before` to `after` volume.
export function tierEvents(scale: readonly Tier[], before: number, after: number): TierEvent[] {
  if (after <= before) return []
  const tiers = [...scale].sort((a, b) => a.minAmount - b.minAmount)
  const numberOf = (tier: Tier | null) => (tier ? tiers.findIndex((item) => item.minAmount === tier.minAmount) + 1 : 0)
  const was = dailyCommission(tiers, before)
  const now = dailyCommission(tiers, after)
  const events: TierEvent[] = []

  if (now.tier && numberOf(now.tier) > numberOf(was.tier)) {
    events.push({ kind: "reached", number: numberOf(now.tier), commission: now.commission })
  }
  if (now.next) {
    const from = now.tier?.minAmount ?? 0
    const gap = now.next.tier.minAmount - from
    // Integer arithmetic: missing / gap <= 20 %.
    if (gap > 0 && now.next.missing * 100 <= gap * NEAR_PERCENT) {
      events.push({ kind: "near", number: numberOf(now.next.tier), missing: now.next.missing, commission: now.next.tier.commission })
    }
  }
  return events
}

export function isLowBalance(balance: number, threshold: number | null): boolean {
  return threshold !== null && balance < threshold
}

// Subscription reminders: 3 days before the deadline, then the day before.
export const SUBSCRIPTION_REMINDER_DAYS: readonly number[] = [3, 1]
