import { startOfDakarDay } from "@/lib/dates"

// Liquidity forecast (pure): at the pace of the last hours, when will an account run dry, and is
// it before the branch closes? Only customer operations (and their cancellations) set the pace;
// top-ups, cash movements and closing adjustments change the balance, never the pace.
// Integer arithmetic only (FCFA and whole minutes). Dakar is UTC+0 all year.

export const WINDOW_MINUTES = 180 // the pace is measured over the last 3 hours
export const MIN_OPERATIONS = 5 // fewer operations: no forecast rather than a wrong one
export const MIN_SPAN_MINUTES = 60 // at least one hour of activity
export const SOON_MINUTES = 120 // "soon": less than 2 hours left (the owner's choice)
const ROUND_MINUTES = 15 // an estimate: shown to the quarter of an hour

const MINUTE_MS = 60_000

export type Flow = { at: Date; delta: number; operationId: string } // one ledger line of a customer operation

export type Forecast =
  | { status: "none" } // not enough activity, balance stable or rising, empty already, or closed
  | { status: "enough" } // lasts until closing at this pace
  | { status: "beforeClosing"; at: Date } // runs dry before closing, in more than 2 hours
  | { status: "soon"; at: Date } // runs dry in less than 2 hours

const NONE: Forecast = { status: "none" }

// Closing time of the branch today: `closesAt` minutes after Dakar midnight.
export function closingInstant(now: Date, closesAt: number): Date {
  return new Date(startOfDakarDay(now).getTime() + closesAt * MINUTE_MS)
}

export function forecastAccount(input: { balance: number; flows: readonly Flow[]; now: Date; closesAt: number }): Forecast {
  const { balance, now } = input
  const closing = closingInstant(now, input.closesAt)
  if (now >= closing || balance <= 0) return NONE

  const from = now.getTime() - WINDOW_MINUTES * MINUTE_MS
  const recent = input.flows.filter((flow) => flow.at.getTime() >= from && flow.at <= now)
  if (new Set(recent.map((flow) => flow.operationId)).size < MIN_OPERATIONS) return NONE

  const first = Math.min(...recent.map((flow) => flow.at.getTime()))
  const span = Math.floor((now.getTime() - first) / MINUTE_MS)
  if (span < MIN_SPAN_MINUTES) return NONE

  const net = recent.reduce((sum, flow) => sum + flow.delta, 0)
  if (net >= 0) return NONE

  // Minutes left = balance / (lost per minute) = balance * span / lost.
  const minutesLeft = Math.floor((balance * span) / -net)
  const at = roundToQuarter(new Date(now.getTime() + minutesLeft * MINUTE_MS))
  if (at >= closing) return { status: "enough" }
  return minutesLeft <= SOON_MINUTES ? { status: "soon", at } : { status: "beforeClosing", at }
}

function roundToQuarter(date: Date): Date {
  const step = ROUND_MINUTES * MINUTE_MS
  return new Date(Math.round(date.getTime() / step) * step)
}

// "16 h", "16 h 15" (Dakar = UTC).
export function formatHour(date: Date): string {
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  return minutes === 0 ? `${hours} h` : `${hours} h ${String(minutes).padStart(2, "0")}`
}
