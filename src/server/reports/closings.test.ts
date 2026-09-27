import { describe, expect, it } from "vitest"

import { summarizeClosings, type ClosingRow } from "@/server/reports/closings"

const day = (d: number) => new Date(`2026-09-${String(d).padStart(2, "0")}T21:00:00.000Z`)
const line = (accountLabel: string, difference: number, justification: string | null = null) => ({ accountLabel, difference, justification })

describe("summarizeClosings", () => {
  it("is empty for a month without closings", () => {
    expect(summarizeClosings([])).toEqual({ count: 0, reopened: 0, withGap: 0, totalDifference: 0, largest: [] })
  })

  it("adds up the differences, counts closings with a gap, largest gap first", () => {
    const rows: ClosingRow[] = [
      { closedAt: day(1), status: "CLOSED", branchName: "UGB", lines: [line("Espèces", 0), line("Wave", 0)] },
      { closedAt: day(2), status: "CLOSED", branchName: "UGB", lines: [line("Espèces", -2_000, "Erreur de rendu"), line("Wave", 500)] },
      { closedAt: day(3), status: "CLOSED", branchName: "Médina", lines: [line("Espèces", 10_000, "Apport non saisi")] },
    ]
    const summary = summarizeClosings(rows)
    expect(summary.count).toBe(3)
    expect(summary.withGap).toBe(2)
    expect(summary.totalDifference).toBe(8_500)
    expect(summary.largest.map((gap) => gap.difference)).toEqual([10_000, -2_000, 500])
    expect(summary.largest[0]).toMatchObject({ branchName: "Médina", accountLabel: "Espèces", justification: "Apport non saisi" })
  })

  it("leaves reopened closings out of the totals and counts them apart", () => {
    const rows: ClosingRow[] = [
      { closedAt: day(4), status: "REOPENED", branchName: "UGB", lines: [line("Espèces", -50_000)] },
      { closedAt: day(5), status: "CLOSED", branchName: "UGB", lines: [line("Espèces", -1_000)] },
    ]
    const summary = summarizeClosings(rows)
    expect(summary).toMatchObject({ count: 1, reopened: 1, withGap: 1, totalDifference: -1_000 })
    expect(summary.largest).toHaveLength(1)
  })

  it("keeps only the largest gaps", () => {
    const rows: ClosingRow[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ closedAt: day(d), status: "CLOSED" as const, branchName: "UGB", lines: [line("Espèces", d * 100)] }))
    expect(summarizeClosings(rows, 3).largest.map((gap) => gap.difference)).toEqual([700, 600, 500])
  })
})
