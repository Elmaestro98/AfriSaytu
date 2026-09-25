import { dayKey, startOfDakarDay } from "@/lib/dates"
import { TYPE_LABELS, type TransactionTypeKey } from "@/lib/operation-types"
import { shares, type SupervisionPeriod } from "@/server/supervision/compute"

// Pure calculations of the statistics screen (F-52). Dakar days (UTC+0 all year).

const DAY_MS = 24 * 60 * 60 * 1000
const MIN_CHART_DAYS = 7

// Days drawn on the chart: at least a week (a single day says nothing), the whole month so far
// for "Ce mois".
export function chartDays(period: SupervisionPeriod, now: Date): number {
  if (period !== "month") return MIN_CHART_DAYS
  const dayOfMonth = Number(dayKey(now).slice(8, 10))
  return Math.max(dayOfMonth, MIN_CHART_DAYS)
}

// First instant covered by a chart of `days` days ending today.
export function chartStart(days: number, now: Date): Date {
  return new Date(startOfDakarDay(now).getTime() - (days - 1) * DAY_MS)
}

export type DayTotals = { key: string; volume: number; commission: number; count: number; isToday: boolean }

// Volume, commission and count per Dakar day over the last `days` days, oldest first, empty
// days included.
export function dailyTotals(
  rows: readonly { createdAt: Date; amount: number; commission: number }[],
  days: number,
  now: Date,
): DayTotals[] {
  const today = startOfDakarDay(now)
  const series: DayTotals[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = dayKey(new Date(today.getTime() - offset * DAY_MS))
    series.push({ key, volume: 0, commission: 0, count: 0, isToday: offset === 0 })
  }
  const byKey = new Map(series.map((day) => [day.key, day]))
  for (const row of rows) {
    const day = byKey.get(dayKey(row.createdAt))
    if (!day) continue
    day.volume += row.amount
    day.commission += row.commission
    day.count += 1
  }
  return series
}

export type TypeShare = {
  type: TransactionTypeKey
  label: string
  count: number
  volume: number
  commission: number
  percent: number // part of the volume, whole percents adding up to 100
}

// One line per operation type with activity, largest volume first.
export function typeBreakdown(
  rows: readonly { type: TransactionTypeKey; count: number; volume: number; commission: number }[],
): TypeShare[] {
  const active = rows.filter((row) => row.count > 0)
  const percents = new Map(shares(active.map((row) => ({ id: row.type, value: row.volume }))).map((share) => [share.id, share.percent]))
  return active
    .map((row) => ({ ...row, label: TYPE_LABELS[row.type], percent: percents.get(row.type) ?? 0 }))
    .sort((a, b) => b.volume - a.volume || b.count - a.count)
}

// Average commission per operation, rounded to the franc.
export function averageCommission(commission: number, count: number): number {
  return count > 0 ? Math.round(commission / count) : 0
}
