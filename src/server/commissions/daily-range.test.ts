import { describe, expect, it } from "vitest"

import { computeDailyRange, sumBy, totalOf, type TierRow } from "@/server/commissions/daily-range"

const FROM_2026 = new Date("2026-01-01T00:00:00Z")
const scale = (operatorId: string, tiers: [number, number | null, number][], validFrom = FROM_2026, validTo: Date | null = null): TierRow[] =>
  tiers.map(([minAmount, maxAmount, commission]) => ({ operatorId, minAmount, maxAmount, commission, validFrom, validTo }))

const WAVE = scale("wave", [[1, 99_999, 500], [100_000, 999_999, 1_000], [1_000_000, null, 5_800]])
const NOW = new Date("2026-09-25T15:00:00Z")
const row = (createdAt: string, amount: number, branchId = "b1", operatorId = "wave") => ({ createdAt: new Date(createdAt), branchId, operatorId, amount })

describe("computeDailyRange", () => {
  it("prices each day's total once, not each operation", () => {
    const days = computeDailyRange([row("2026-09-25T08:00:00Z", 60_000), row("2026-09-25T10:00:00Z", 50_000)], WAVE, NOW)
    expect(days).toEqual([{ day: "2026-09-25", branchId: "b1", operatorId: "wave", volume: 110_000, commission: 1_000 }])
  })

  it("keeps days, branches and operators apart", () => {
    const days = computeDailyRange(
      [row("2026-09-24T23:59:00Z", 60_000), row("2026-09-25T00:01:00Z", 60_000), row("2026-09-25T09:00:00Z", 60_000, "b2")],
      WAVE,
      NOW,
    )
    expect(days.map((day) => [day.day, day.branchId, day.commission])).toEqual([
      ["2026-09-24", "b1", 500],
      ["2026-09-25", "b1", 500],
      ["2026-09-25", "b2", 500],
    ])
  })

  it("prices a past day with the scale of that day, not today's", () => {
    const change = new Date("2026-09-25T00:00:00Z")
    const tiers = [...scale("wave", [[1, null, 100]], FROM_2026, change), ...scale("wave", [[1, null, 900]], change)]
    const days = computeDailyRange([row("2026-09-24T12:00:00Z", 10_000), row("2026-09-25T12:00:00Z", 10_000)], tiers, NOW)
    expect(days.map((day) => day.commission)).toEqual([100, 900])
  })

  it("earns nothing for an operator without a scale", () => {
    expect(computeDailyRange([row("2026-09-25T08:00:00Z", 60_000, "b1", "om")], WAVE, NOW)[0].commission).toBe(0)
  })
})

describe("sums", () => {
  it("adds commissions per key and in total", () => {
    const days = computeDailyRange([row("2026-09-24T08:00:00Z", 60_000), row("2026-09-25T08:00:00Z", 2_000_000)], WAVE, NOW)
    expect(totalOf(days)).toBe(6_300)
    expect(sumBy(days, (day) => day.day)).toEqual(new Map([["2026-09-24", 500], ["2026-09-25", 5_800]]))
  })
})
