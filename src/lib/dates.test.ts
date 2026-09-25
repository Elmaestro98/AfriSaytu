import { describe, expect, it } from "vitest"

import { dayKey, formatDayLabel, formatTime } from "@/lib/dates"

const NOW = new Date("2026-09-25T10:00:00.000Z") // Dakar is UTC+0 all year

describe("dates in Africa/Dakar", () => {
  it("formats the time as HH:MM", () => {
    expect(formatTime(new Date("2026-09-25T14:32:00.000Z"))).toBe("14:32")
  })

  it("groups by calendar day", () => {
    expect(dayKey(new Date("2026-09-25T23:59:00.000Z"))).toBe("2026-09-25")
    expect(dayKey(new Date("2026-09-26T00:01:00.000Z"))).toBe("2026-09-26")
  })

  it("says today and yesterday in words", () => {
    expect(formatDayLabel(new Date("2026-09-25T08:00:00.000Z"), NOW)).toBe("Aujourd'hui")
    expect(formatDayLabel(new Date("2026-09-24T20:00:00.000Z"), NOW)).toBe("Hier")
    expect(formatDayLabel(new Date("2026-09-23T20:00:00.000Z"), NOW)).toBe("Mercredi 23 septembre")
  })
})
