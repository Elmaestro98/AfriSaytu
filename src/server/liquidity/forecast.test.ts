import { describe, expect, it } from "vitest"

import { minutesToTime, timeToMinutes } from "@/lib/dates"
import { forecastAccount, formatHour, type Flow } from "@/server/liquidity/forecast"

const NOW = new Date("2026-09-27T13:00:00.000Z") // 13:00 in Dakar
const CLOSES = 21 * 60

// `count` operations spread evenly over the last `minutes`, each moving `delta`.
function flows(count: number, minutes: number, delta: number): Flow[] {
  return Array.from({ length: count }, (_, index) => ({
    at: new Date(NOW.getTime() - (minutes - (index * minutes) / count) * 60_000),
    delta,
    operationId: `op${index}`,
  }))
}

describe("forecastAccount", () => {
  it("says nothing without enough activity", () => {
    expect(forecastAccount({ balance: 100_000, flows: flows(4, 180, -50_000), now: NOW, closesAt: CLOSES })).toEqual({ status: "none" })
    // Five operations, but all in the last 30 minutes: less than an hour of activity.
    expect(forecastAccount({ balance: 100_000, flows: flows(5, 30, -50_000), now: NOW, closesAt: CLOSES })).toEqual({ status: "none" })
  })

  it("says nothing when the balance does not go down", () => {
    expect(forecastAccount({ balance: 100_000, flows: flows(6, 180, 20_000), now: NOW, closesAt: CLOSES })).toEqual({ status: "none" })
  })

  it("warns when the account runs dry in less than 2 hours", () => {
    // 300 000 lost over 3 hours = 100 000 an hour; 150 000 left -> 1 h 30 -> 14:30.
    const forecast = forecastAccount({ balance: 150_000, flows: flows(6, 180, -50_000), now: NOW, closesAt: CLOSES })
    expect(forecast).toEqual({ status: "soon", at: new Date("2026-09-27T14:30:00.000Z") })
  })

  it("tells it runs dry before closing, later in the day", () => {
    // 100 000 an hour, 500 000 left -> 5 hours -> 18:00, before 21:00.
    const forecast = forecastAccount({ balance: 500_000, flows: flows(6, 180, -50_000), now: NOW, closesAt: CLOSES })
    expect(forecast).toEqual({ status: "beforeClosing", at: new Date("2026-09-27T18:00:00.000Z") })
  })

  it("reassures when the balance lasts until closing", () => {
    expect(forecastAccount({ balance: 900_000, flows: flows(6, 180, -50_000), now: NOW, closesAt: CLOSES })).toEqual({ status: "enough" })
    // The same account lasts until an earlier closing too.
    expect(forecastAccount({ balance: 500_000, flows: flows(6, 180, -50_000), now: NOW, closesAt: 17 * 60 })).toEqual({ status: "enough" })
  })

  it("only measures the pace over the last 3 hours", () => {
    const old = { at: new Date(NOW.getTime() - 5 * 3_600_000), delta: -5_000_000, operationId: "old" }
    const forecast = forecastAccount({ balance: 900_000, flows: [old, ...flows(6, 180, -50_000)], now: NOW, closesAt: CLOSES })
    expect(forecast).toEqual({ status: "enough" })
  })

  it("counts an operation once, even with its cancellation line", () => {
    const pairs = flows(4, 180, -50_000).flatMap((flow) => [flow, { ...flow, delta: 0 }])
    expect(forecastAccount({ balance: 100_000, flows: pairs, now: NOW, closesAt: CLOSES })).toEqual({ status: "none" })
  })

  it("stops once the branch is closed, or the account already empty", () => {
    expect(forecastAccount({ balance: 150_000, flows: flows(6, 180, -50_000), now: NOW, closesAt: 12 * 60 })).toEqual({ status: "none" })
    expect(forecastAccount({ balance: 0, flows: flows(6, 180, -50_000), now: NOW, closesAt: CLOSES })).toEqual({ status: "none" })
  })
})

describe("time helpers", () => {
  it("shows hours the French way", () => {
    expect(formatHour(new Date("2026-09-27T16:00:00.000Z"))).toBe("16 h")
    expect(formatHour(new Date("2026-09-27T09:15:00.000Z"))).toBe("9 h 15")
  })

  it("reads and writes the closing time", () => {
    expect(minutesToTime(1260)).toBe("21:00")
    expect(minutesToTime(450)).toBe("07:30")
    expect(timeToMinutes("19:30")).toBe(1170)
    expect(timeToMinutes("24:00")).toBeNull()
    expect(timeToMinutes("7:5")).toBeNull()
  })
})
