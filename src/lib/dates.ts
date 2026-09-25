// Dates are shown in the Africa/Dakar time zone, whatever the device's settings.
export const TIME_ZONE = "Africa/Dakar"

const timeFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" })
const dayFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" })
const keyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" })

// 14:32
export function formatTime(date: Date): string {
  return timeFormat.format(date)
}

// "2026-09-25": the calendar day in Dakar, used to group operations.
export function dayKey(date: Date): string {
  return keyFormat.format(date)
}

// Midnight of the current day in Dakar. Dakar is UTC+0 all year (no daylight saving), so the
// local midnight is the UTC midnight of the Dakar calendar day.
export function startOfDakarDay(now: Date = new Date()): Date {
  return new Date(`${dayKey(now)}T00:00:00.000Z`)
}

const longDayFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" })

// "Vendredi 25 septembre 2026"
export function formatLongDate(date: Date): string {
  const label = longDayFormat.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// "Aujourd'hui", "Hier", or "mercredi 23 septembre".
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  const key = dayKey(date)
  if (key === dayKey(now)) return "Aujourd'hui"
  if (key === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return "Hier"
  const label = dayFormat.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

const shortDayFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, weekday: "short", day: "numeric" })

// "2026-09-25" -> "ven. 25", for chart axes.
export function formatShortDay(key: string): string {
  return shortDayFormat.format(new Date(`${key}T12:00:00.000Z`))
}

// Same day `months` months later (negative: earlier), same time of day, clamped to the end of a
// shorter month: 31 January + 1 month = 28 or 29 February. Dakar is UTC+0 all year.
export function addCalendarMonths(date: Date, months: number): Date {
  const firstOfTarget = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate()
  const result = new Date(date)
  result.setUTCFullYear(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), Math.min(date.getUTCDate(), lastDay))
  return result
}

// Months as "2026-09" (Dakar calendar), for monthly reports such as the commission reconciliation.
export function monthKey(date: Date): string {
  return dayKey(date).slice(0, 7)
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

// "2026-09" -> "2026-08"; `offset` months later (negative: earlier).
export function shiftMonth(key: string, offset: number): string {
  return monthKey(addCalendarMonths(new Date(`${key}-01T12:00:00.000Z`), offset))
}

// First and last instant of a month in Dakar (UTC+0 all year).
export function monthRange(key: string): { from: Date; to: Date } {
  const from = new Date(`${key}-01T00:00:00.000Z`)
  const to = new Date(new Date(`${shiftMonth(key, 1)}-01T00:00:00.000Z`).getTime() - 1)
  return { from, to }
}

const monthFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: TIME_ZONE, month: "long", year: "numeric" })

// "2026-09" -> "septembre 2026"
export function formatMonth(key: string): string {
  return monthFormat.format(new Date(`${key}-15T12:00:00.000Z`))
}
