import { describe, expect, it } from "vitest"

import { monthDayKeys } from "@/lib/dates"
import { defaultReportMonth, previousWindow, reportMonths } from "@/server/reports/months"

const NOW = new Date("2026-09-27T10:00:00.000Z")

describe("reportMonths", () => {
  it("offers the current month then a year back when the plan shows everything", () => {
    const months = reportMonths(NOW, null)
    expect(months).toHaveLength(12)
    expect(months[0]).toBe("2026-09")
    expect(months[1]).toBe("2026-08")
    expect(months.at(-1)).toBe("2025-10")
  })

  it("stops at the first month not wholly inside the plan's history (Basic: 3 months)", () => {
    // Basic on 27 September: history from 27 June, so June is only partly visible.
    expect(reportMonths(NOW, new Date("2026-06-27T00:00:00.000Z"))).toEqual(["2026-09", "2026-08", "2026-07"])
  })

  it("keeps a month that starts exactly where the history starts", () => {
    expect(reportMonths(NOW, new Date("2026-07-01T00:00:00.000Z"))).toEqual(["2026-09", "2026-08", "2026-07"])
  })

  it("always offers the current month", () => {
    expect(reportMonths(NOW, new Date("2026-09-20T00:00:00.000Z"))).toEqual(["2026-09"])
  })

  it("crosses the year", () => {
    expect(reportMonths(new Date("2026-01-10T12:00:00.000Z"), null, 3)).toEqual(["2026-01", "2025-12", "2025-11"])
  })
})

describe("defaultReportMonth", () => {
  it("prefers last month, the usual monthly report", () => {
    expect(defaultReportMonth(["2026-09", "2026-08"])).toBe("2026-08")
  })

  it("falls back to the current month when it is the only one", () => {
    expect(defaultReportMonth(["2026-09"])).toBe("2026-09")
  })
})

describe("previousWindow", () => {
  it("compares a whole month with the whole previous month", () => {
    const window = previousWindow("2026-08", new Date("2026-08-31T23:59:59.999Z"))
    expect(window.from.toISOString()).toBe("2026-07-01T00:00:00.000Z")
    expect(window.to.toISOString()).toBe("2026-07-31T23:59:59.999Z")
  })

  it("compares a month in progress with the same number of days of the previous one", () => {
    const window = previousWindow("2026-09", NOW)
    expect(window.from.toISOString()).toBe("2026-08-01T00:00:00.000Z")
    expect(window.to.toISOString()).toBe("2026-08-27T10:00:00.000Z")
  })

  it("never goes past the end of a shorter previous month", () => {
    const window = previousWindow("2026-03", new Date("2026-03-31T23:59:59.999Z"))
    expect(window.to.toISOString()).toBe("2026-02-28T23:59:59.999Z")
  })
})

describe("monthDayKeys", () => {
  it("lists every day of the month", () => {
    const days = monthDayKeys("2026-02")
    expect(days).toHaveLength(28)
    expect(days[0]).toBe("2026-02-01")
    expect(days.at(-1)).toBe("2026-02-28")
  })

  it("handles a leap February and 31-day months", () => {
    expect(monthDayKeys("2028-02")).toHaveLength(29)
    expect(monthDayKeys("2026-12").at(-1)).toBe("2026-12-31")
  })
})
