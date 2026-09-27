// Closings of a report's month, summed up (pure).

export type ClosingRow = {
  closedAt: Date
  status: "CLOSED" | "REOPENED"
  branchName: string
  lines: readonly { accountLabel: string; difference: number; justification: string | null }[]
}

export type ClosingGap = {
  closedAt: Date
  branchName: string
  accountLabel: string
  difference: number
  justification: string | null
}

export type ClosingSummary = {
  count: number
  reopened: number // closed then reopened: their adjustments were reversed
  withGap: number // closings with at least one difference
  totalDifference: number // sum of the differences of the closings still in force
  largest: ClosingGap[] // largest differences first, at most `limit`
}

export const LARGEST_GAPS = 5

// A reopened closing no longer counts in the totals (its adjustments were reversed); it is only
// counted as reopened.
export function summarizeClosings(rows: readonly ClosingRow[], limit = LARGEST_GAPS): ClosingSummary {
  const inForce = rows.filter((row) => row.status === "CLOSED")
  const gaps = inForce.flatMap((row) =>
    row.lines
      .filter((line) => line.difference !== 0)
      .map((line) => ({ closedAt: row.closedAt, branchName: row.branchName, accountLabel: line.accountLabel, difference: line.difference, justification: line.justification })),
  )
  return {
    count: inForce.length,
    reopened: rows.length - inForce.length,
    withGap: inForce.filter((row) => row.lines.some((line) => line.difference !== 0)).length,
    totalDifference: gaps.reduce((sum, gap) => sum + gap.difference, 0),
    largest: [...gaps]
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference) || a.closedAt.getTime() - b.closedAt.getTime())
      .slice(0, limit),
  }
}
