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

// "Aujourd'hui", "Hier", or "mercredi 23 septembre".
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  const key = dayKey(date)
  if (key === dayKey(now)) return "Aujourd'hui"
  if (key === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return "Hier"
  const label = dayFormat.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}
