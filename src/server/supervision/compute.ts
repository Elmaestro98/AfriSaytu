import { dayKey, startOfDakarDay } from "@/lib/dates"

// Pure calculations of the supervision screen (mockup 01). Dakar days (UTC+0 all year).

export const SUPERVISION_PERIODS = ["today", "7d", "month"] as const
export type SupervisionPeriod = (typeof SUPERVISION_PERIODS)[number]

export const SUPERVISION_PERIOD_LABELS: Record<SupervisionPeriod, string> = {
  today: "Aujourd'hui",
  "7d": "7 derniers jours",
  month: "Ce mois",
}

const DAY_MS = 24 * 60 * 60 * 1000

export type Range = { from: Date; to: Date }

// Current period and the previous one of the same length, to compare.
export function periodRanges(period: SupervisionPeriod, now: Date): { current: Range; previous: Range } {
  const today = startOfDakarDay(now)
  const from =
    period === "today"
      ? today
      : period === "7d"
        ? new Date(today.getTime() - 6 * DAY_MS)
        : new Date(`${dayKey(now).slice(0, 8)}01T00:00:00.000Z`)
  const length = now.getTime() - from.getTime()
  return {
    current: { from, to: now },
    previous: { from: new Date(from.getTime() - length), to: from },
  }
}

// +14 means +14 %. null when there is nothing to compare with.
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type DayVolume = { key: string; volume: number; isToday: boolean }

// Volume per Dakar day over the last `days` days, oldest first, empty days included.
export function dailySeries(rows: readonly { createdAt: Date; amount: number }[], days: number, now: Date): DayVolume[] {
  const today = startOfDakarDay(now)
  const series: DayVolume[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = dayKey(new Date(today.getTime() - offset * DAY_MS))
    series.push({ key, volume: 0, isToday: offset === 0 })
  }
  const byKey = new Map(series.map((day) => [day.key, day]))
  for (const row of rows) {
    const day = byKey.get(dayKey(row.createdAt))
    if (day) day.volume += row.amount
  }
  return series
}

export type Share = { id: string; value: number; percent: number }

// Shares of a total, in whole percents that add up to 100 (largest remainder).
export function shares(items: readonly { id: string; value: number }[]): Share[] {
  const total = items.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) return items.map((item) => ({ ...item, percent: 0 }))

  const raw = items.map((item) => ({ ...item, exact: (item.value / total) * 100 }))
  const result = raw.map((item) => ({ id: item.id, value: item.value, percent: Math.floor(item.exact) }))
  let missing = 100 - result.reduce((sum, item) => sum + item.percent, 0)
  const byRemainder = raw.map((item, index) => ({ index, remainder: item.exact - Math.floor(item.exact) })).sort((a, b) => b.remainder - a.remainder)
  for (const { index } of byRemainder) {
    if (missing <= 0) break
    result[index].percent += 1
    missing -= 1
  }
  return result
}
