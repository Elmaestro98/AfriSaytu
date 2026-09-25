import { describe, expect, it } from "vitest"

import { averageCommission, chartDays, chartStart, dailyTotals, typeBreakdown } from "@/server/stats/compute"

const NOW = new Date("2026-09-25T15:00:00.000Z")

describe("chartDays", () => {
  it("draws a week for today and the last 7 days", () => {
    expect(chartDays("today", NOW)).toBe(7)
    expect(chartDays("7d", NOW)).toBe(7)
  })

  it("draws the month so far", () => {
    expect(chartDays("month", NOW)).toBe(25)
  })

  it("never draws less than a week at the start of a month", () => {
    expect(chartDays("month", new Date("2026-10-02T09:00:00.000Z"))).toBe(7)
  })
})

describe("chartStart", () => {
  it("starts at Dakar midnight, days - 1 days ago", () => {
    expect(chartStart(7, NOW)).toEqual(new Date("2026-09-19T00:00:00.000Z"))
    expect(chartStart(1, NOW)).toEqual(new Date("2026-09-25T00:00:00.000Z"))
  })
})

describe("dailyTotals", () => {
  it("keeps empty days and sums per day", () => {
    const series = dailyTotals(
      [
        { createdAt: new Date("2026-09-25T08:00:00.000Z"), amount: 10_000, commission: 150 },
        { createdAt: new Date("2026-09-25T14:00:00.000Z"), amount: 5_000, commission: 75 },
        { createdAt: new Date("2026-09-23T10:00:00.000Z"), amount: 2_000, commission: 30 },
      ],
      3,
      NOW,
    )
    expect(series).toEqual([
      { key: "2026-09-23", volume: 2_000, commission: 30, count: 1, isToday: false },
      { key: "2026-09-24", volume: 0, commission: 0, count: 0, isToday: false },
      { key: "2026-09-25", volume: 15_000, commission: 225, count: 2, isToday: true },
    ])
  })

  it("ignores rows outside the window", () => {
    const series = dailyTotals([{ createdAt: new Date("2026-09-20T10:00:00.000Z"), amount: 9_000, commission: 90 }], 2, NOW)
    expect(series.every((day) => day.volume === 0 && day.count === 0)).toBe(true)
  })

  it("puts 23:59 and 00:00 on two different Dakar days", () => {
    const series = dailyTotals(
      [
        { createdAt: new Date("2026-09-24T23:59:59.000Z"), amount: 1_000, commission: 10 },
        { createdAt: new Date("2026-09-25T00:00:00.000Z"), amount: 2_000, commission: 20 },
      ],
      2,
      NOW,
    )
    expect(series.map((day) => day.volume)).toEqual([1_000, 2_000])
  })
})

describe("typeBreakdown", () => {
  it("sorts by volume, adds French labels and percents that add up to 100", () => {
    const result = typeBreakdown([
      { type: "DEPOSIT", count: 3, volume: 10_000, commission: 100 },
      { type: "WITHDRAWAL", count: 2, volume: 20_000, commission: 200 },
      { type: "AIRTIME", count: 1, volume: 3_333, commission: 0 },
    ])
    expect(result.map((row) => row.label)).toEqual(["Retrait", "Dépôt", "Crédit"])
    expect(result.reduce((sum, row) => sum + row.percent, 0)).toBe(100)
  })

  it("drops types without operations", () => {
    expect(typeBreakdown([{ type: "BILL", count: 0, volume: 0, commission: 0 }])).toEqual([])
  })

  it("gives 0 % everywhere when every volume is zero", () => {
    const result = typeBreakdown([{ type: "OTHER", count: 2, volume: 0, commission: 0 }])
    expect(result[0].percent).toBe(0)
  })
})

describe("averageCommission", () => {
  it("rounds to the franc and handles no operations", () => {
    expect(averageCommission(1_000, 3)).toBe(333)
    expect(averageCommission(0, 0)).toBe(0)
  })
})
