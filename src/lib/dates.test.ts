import { describe, expect, it } from "vitest"

import { addCalendarMonths, dayKey, formatDayLabel, formatLongDate, formatShortDay, formatTime, startOfDakarDay } from "@/lib/dates"

const NOW = new Date("2026-09-25T10:00:00.000Z") // Dakar is UTC+0 all year

describe("dates in Africa/Dakar", () => {
  it("formats the time as HH:MM", () => {
    expect(formatTime(new Date("2026-09-25T14:32:00.000Z"))).toBe("14:32")
  })

  it("groups by calendar day", () => {
    expect(dayKey(new Date("2026-09-25T23:59:00.000Z"))).toBe("2026-09-25")
    expect(dayKey(new Date("2026-09-26T00:01:00.000Z"))).toBe("2026-09-26")
  })

  it("finds the start of the Dakar day", () => {
    expect(startOfDakarDay(new Date("2026-09-25T23:59:59.000Z")).toISOString()).toBe("2026-09-25T00:00:00.000Z")
    expect(startOfDakarDay(new Date("2026-09-25T00:00:00.000Z")).toISOString()).toBe("2026-09-25T00:00:00.000Z")
  })

  it("writes a short day for charts", () => {
    expect(formatShortDay("2026-09-25")).toBe("ven. 25")
  })

  it("writes a full date", () => {
    expect(formatLongDate(NOW)).toBe("Vendredi 25 septembre 2026")
  })

  it("says today and yesterday in words", () => {
    expect(formatDayLabel(new Date("2026-09-25T08:00:00.000Z"), NOW)).toBe("Aujourd'hui")
    expect(formatDayLabel(new Date("2026-09-24T20:00:00.000Z"), NOW)).toBe("Hier")
    expect(formatDayLabel(new Date("2026-09-23T20:00:00.000Z"), NOW)).toBe("Mercredi 23 septembre")
  })
})

describe("addCalendarMonths", () => {
  it("keeps the day and the time", () => {
    expect(addCalendarMonths(new Date("2026-09-25T10:30:00.000Z"), 1)).toEqual(new Date("2026-10-25T10:30:00.000Z"))
  })

  it("clamps to the end of a shorter month, leap years included", () => {
    expect(addCalendarMonths(new Date("2026-01-31T08:00:00.000Z"), 1)).toEqual(new Date("2026-02-28T08:00:00.000Z"))
    expect(addCalendarMonths(new Date("2028-01-31T08:00:00.000Z"), 1)).toEqual(new Date("2028-02-29T08:00:00.000Z"))
  })

  it("crosses years both ways", () => {
    expect(addCalendarMonths(new Date("2026-11-15T00:00:00.000Z"), 3)).toEqual(new Date("2027-02-15T00:00:00.000Z"))
    expect(addCalendarMonths(new Date("2027-01-15T00:00:00.000Z"), -3)).toEqual(new Date("2026-10-15T00:00:00.000Z"))
  })
})
