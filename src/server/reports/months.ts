import { monthKey, monthRange, shiftMonth } from "@/lib/dates"

// Months a monthly report can cover (pure). A year at most.
export const MAX_REPORT_MONTHS = 12

// The current month (so far), then the previous ones as long as the whole month is inside the
// history the plan shows (`historySince`, null = everything): a report never shows more than the
// history screen does. Newest first.
export function reportMonths(now: Date, historySince: Date | null, max = MAX_REPORT_MONTHS): string[] {
  const current = monthKey(now)
  const months = [current]
  for (let offset = 1; months.length < max; offset += 1) {
    const key = shiftMonth(current, -offset)
    if (historySince && monthRange(key).from < historySince) break
    months.push(key)
  }
  return months
}

// The month before the current one, where a report is usually wanted, when it is offered;
// otherwise the current month.
export function defaultReportMonth(months: readonly string[]): string {
  return months[1] ?? months[0]
}

// The window compared with the report's month: the previous month over the same number of
// days (a month still in progress is compared with the start of the previous one).
export function previousWindow(month: string, to: Date): { from: Date; to: Date } {
  const { from } = monthRange(month)
  const previous = monthRange(shiftMonth(month, -1))
  const end = new Date(previous.from.getTime() + (to.getTime() - from.getTime()))
  return { from: previous.from, to: end < previous.to ? end : previous.to }
}
