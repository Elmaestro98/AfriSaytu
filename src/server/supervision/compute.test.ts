import { describe, expect, it } from "vitest"

import { dailySeries, percentChange, periodRanges, shares } from "@/server/supervision/compute"

const NOW = new Date("2026-09-25T15:00:00.000Z")

describe("periodRanges", () => {
  it("compares today with the same hours yesterday", () => {
    const { current, previous } = periodRanges("today", NOW)
    expect(current.from.toISOString()).toBe("2026-09-25T00:00:00.000Z")
    expect(previous.from.toISOString()).toBe("2026-09-24T09:00:00.000Z")
    expect(previous.to).toEqual(current.from)
  })

  it("starts 7 days back, and at the first of the month", () => {
    expect(periodRanges("7d", NOW).current.from.toISOString()).toBe("2026-09-19T00:00:00.000Z")
    expect(periodRanges("month", NOW).current.from.toISOString()).toBe("2026-09-01T00:00:00.000Z")
  })
})

describe("percentChange", () => {
  it("rounds to a whole percent", () => {
    expect(percentChange(1_250_000, 1_116_000)).toBe(12)
    expect(percentChange(900, 1_000)).toBe(-10)
  })

  it("has nothing to compare with an empty previous period", () => {
    expect(percentChange(500, 0)).toBeNull()
  })
})

describe("dailySeries", () => {
  it("fills every day, oldest first, with today last", () => {
    const series = dailySeries(
      [
        { createdAt: new Date("2026-09-25T08:00:00.000Z"), amount: 1_000 },
        { createdAt: new Date("2026-09-25T09:00:00.000Z"), amount: 500 },
        { createdAt: new Date("2026-09-23T23:59:00.000Z"), amount: 200 },
        { createdAt: new Date("2026-09-01T10:00:00.000Z"), amount: 9_999 }, // outside the window
      ],
      3,
      NOW,
    )
    expect(series).toEqual([
      { key: "2026-09-23", volume: 200, isToday: false },
      { key: "2026-09-24", volume: 0, isToday: false },
      { key: "2026-09-25", volume: 1_500, isToday: true },
    ])
  })
})

describe("shares", () => {
  it("gives whole percents that add up to 100 (mockup 01: 52 / 34 / 14)", () => {
    const result = shares([
      { id: "wave", value: 4_394_000 },
      { id: "om", value: 2_873_000 },
      { id: "mixx", value: 1_183_000 },
    ])
    expect(result.map((share) => share.percent)).toEqual([52, 34, 14])
  })

  it("still adds up to 100 with thirds", () => {
    const result = shares([{ id: "a", value: 1 }, { id: "b", value: 1 }, { id: "c", value: 1 }])
    expect(result.reduce((sum, share) => sum + share.percent, 0)).toBe(100)
  })

  it("is 0 for everyone when there is nothing", () => {
    expect(shares([{ id: "a", value: 0 }])).toEqual([{ id: "a", value: 0, percent: 0 }])
  })
})
