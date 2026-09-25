import { describe, expect, it } from "vitest"

import { checkTiers, dailyCommission, perOperationQuote, tiersInForce, type Tier } from "@/server/commissions/daily"

// The first tiers of the Wave Senegal scale (public/barémeWave.jpeg), gaps closed (max = next - 1).
const WAVE: Tier[] = [
  { minAmount: 1, maxAmount: 9_999, commission: 50 },
  { minAmount: 10_000, maxAmount: 99_999, commission: 500 },
  { minAmount: 100_000, maxAmount: 174_999, commission: 1_000 },
  { minAmount: 175_000, maxAmount: 249_999, commission: 1_600 },
  { minAmount: 250_000, maxAmount: 599_999, commission: 2_640 },
  { minAmount: 600_000, maxAmount: 999_999, commission: 3_800 },
  { minAmount: 1_000_000, maxAmount: 1_499_999, commission: 5_800 },
  { minAmount: 1_500_000, maxAmount: 1_999_999, commission: 6_650 },
  { minAmount: 2_000_000, maxAmount: null, commission: 7_100 },
]

describe("dailyCommission", () => {
  it("gives the commission of the tier the day's total falls in (user's example)", () => {
    expect(dailyCommission(WAVE, 1_500_000)).toMatchObject({ commission: 6_650, tier: WAVE[7] })
  })

  it("includes both ends of a tier", () => {
    expect(dailyCommission(WAVE, 10_000).commission).toBe(500)
    expect(dailyCommission(WAVE, 99_999).commission).toBe(500)
    expect(dailyCommission(WAVE, 100_000).commission).toBe(1_000)
  })

  it("tells how much volume the next tier still needs", () => {
    expect(dailyCommission(WAVE, 1_820_000).next).toEqual({ tier: WAVE[8], missing: 180_000 })
  })

  it("earns nothing with no volume, and points to the first tier", () => {
    expect(dailyCommission(WAVE, 0)).toEqual({ volume: 0, commission: 0, tier: null, next: { tier: WAVE[0], missing: 1 } })
  })

  it("keeps the last open tier for any higher total, with no next tier", () => {
    expect(dailyCommission(WAVE, 90_000_000)).toMatchObject({ commission: 7_100, next: null })
  })

  it("earns nothing above a closed scale", () => {
    const closed = WAVE.slice(0, 2)
    expect(dailyCommission(closed, 150_000)).toMatchObject({ commission: 0, tier: null, next: null })
  })
})

describe("checkTiers", () => {
  it("accepts the Wave scale, in any order", () => {
    expect(checkTiers([...WAVE].reverse())).toEqual({ ok: true, tiers: WAVE })
  })

  it("refuses a gap between two tiers (9 995 then 10 000, as printed by Wave)", () => {
    const withGap = [{ minAmount: 1, maxAmount: 9_995, commission: 50 }, { minAmount: 10_000, maxAmount: null, commission: 500 }]
    expect(checkTiers(withGap)).toEqual({ ok: false, error: "Palier 2 : il doit commencer à 9 996 FCFA, juste après le palier précédent." })
  })

  it("refuses overlapping tiers", () => {
    const overlap = [{ minAmount: 1, maxAmount: 10_000, commission: 50 }, { minAmount: 10_000, maxAmount: null, commission: 500 }]
    expect(checkTiers(overlap).ok).toBe(false)
  })

  it("refuses an open tier that is not the last, decimals, negatives and an empty scale", () => {
    expect(checkTiers([{ minAmount: 1, maxAmount: null, commission: 50 }, { minAmount: 10, maxAmount: 20, commission: 1 }]).ok).toBe(false)
    expect(checkTiers([{ minAmount: 1, maxAmount: 10, commission: 12.5 }]).ok).toBe(false)
    expect(checkTiers([{ minAmount: -1, maxAmount: 10, commission: 5 }]).ok).toBe(false)
    expect(checkTiers([{ minAmount: 10, maxAmount: 5, commission: 5 }]).ok).toBe(false)
    expect(checkTiers([]).ok).toBe(false)
  })
})

describe("tiersInForce", () => {
  const old = { id: "old", validFrom: new Date("2026-01-01T00:00:00Z"), validTo: new Date("2026-09-20T10:00:00Z") }
  const current = { id: "new", validFrom: new Date("2026-09-20T10:00:00Z"), validTo: null }

  it("uses the scale of the day asked, not today's", () => {
    expect(tiersInForce([old, current], new Date("2026-09-19T23:59:59Z")).map((row) => row.id)).toEqual(["old"])
    expect(tiersInForce([old, current], new Date("2026-09-25T12:00:00Z")).map((row) => row.id)).toEqual(["new"])
  })
})

describe("perOperationQuote", () => {
  const ruled = { commissionRuleId: "r1", commission: 300, fee: 100, noRule: false }
  const none = { commissionRuleId: null, commission: 0, fee: 0, noRule: true }

  it("gives deposits and withdrawals no commission of their own, never flagged, fee kept", () => {
    expect(perOperationQuote(ruled, "DEPOSIT")).toEqual({ commissionRuleId: null, commission: 0, fee: 100, noRule: false })
    expect(perOperationQuote(none, "WITHDRAWAL")).toMatchObject({ commission: 0, noRule: false })
  })

  it("keeps the rule of the other types, and does not flag them without one", () => {
    expect(perOperationQuote(ruled, "SEND")).toEqual(ruled)
    expect(perOperationQuote(none, "AIRTIME").noRule).toBe(false)
  })
})
