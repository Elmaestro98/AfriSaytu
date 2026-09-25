import { describe, expect, it } from "vitest"

import { reconcile } from "@/server/commissions/reconcile"

describe("reconcile", () => {
  it("compares what was computed with what the operator paid, shortfall first", () => {
    const rows = reconcile(new Map([["wave", 185_000], ["om", 40_000]]), new Map([["wave", 180_000], ["om", 40_000]]))
    expect(rows).toEqual([
      { operatorId: "wave", estimated: 185_000, received: 180_000, gap: -5_000 },
      { operatorId: "om", estimated: 40_000, received: 40_000, gap: 0 },
    ])
  })

  it("shows a payout with nothing computed, and an operator not paid at all", () => {
    const rows = reconcile(new Map([["mixx", 12_000]]), new Map([["wave", 3_000]]))
    expect(rows).toEqual([
      { operatorId: "mixx", estimated: 12_000, received: 0, gap: -12_000 },
      { operatorId: "wave", estimated: 0, received: 3_000, gap: 3_000 },
    ])
  })

  it("leaves out operators with nothing on either side", () => {
    expect(reconcile(new Map([["om", 0]]), new Map())).toEqual([])
  })
})
