import { describe, expect, it } from "vitest"

import { needsJustification, planClosing, type ClosingAccount } from "@/server/closing/compute"

// Annexe B.2 of the cahier: theoretical UV 750 000, cash 50 000; counted cash 48 000.
const accounts: ClosingAccount[] = [
  { id: "uv", label: "Opérateur X", opening: 500_000, theoretical: 750_000 },
  { id: "cash", label: "Caisse espèces", opening: 300_000, theoretical: 50_000 },
]

describe("needsJustification", () => {
  it("requires a reason for any difference when the threshold is 0", () => {
    expect(needsJustification(0, 0)).toBe(false)
    expect(needsJustification(-1, 0)).toBe(true)
    expect(needsJustification(5, 0)).toBe(true)
  })

  it("requires a reason only beyond a threshold", () => {
    expect(needsJustification(-1_000, 1_000)).toBe(false)
    expect(needsJustification(-1_001, 1_000)).toBe(true)
    expect(needsJustification(2_000, 1_000)).toBe(true)
  })
})

describe("planClosing", () => {
  it("computes Annexe B.2: no UV difference, -2 000 on cash", () => {
    const plan = planClosing(
      accounts,
      [
        { accountId: "uv", counted: 750_000, justification: null },
        { accountId: "cash", counted: 48_000, justification: "Erreur de rendu monnaie" },
      ],
      0,
    )
    expect(plan).toEqual({
      ok: true,
      totalDifference: -2_000,
      lines: [
        { accountId: "uv", openingBalance: 500_000, theoreticalBalance: 750_000, countedBalance: 750_000, difference: 0, justification: null },
        { accountId: "cash", openingBalance: 300_000, theoreticalBalance: 50_000, countedBalance: 48_000, difference: -2_000, justification: "Erreur de rendu monnaie" },
      ],
    })
  })

  it("refuses a difference without justification", () => {
    const plan = planClosing(
      accounts,
      [
        { accountId: "uv", counted: 750_000, justification: null },
        { accountId: "cash", counted: 48_000, justification: "   " },
      ],
      0,
    )
    expect(plan).toEqual({ ok: false, error: "Expliquez l'écart de Caisse espèces.", accountId: "cash" })
  })

  it("accepts a small difference without justification under the threshold", () => {
    const plan = planClosing(
      accounts,
      [
        { accountId: "uv", counted: 750_000, justification: null },
        { accountId: "cash", counted: 49_500, justification: null },
      ],
      1_000,
    )
    expect(plan.ok).toBe(true)
  })

  it("requires every account, and only accounts of the branch", () => {
    expect(planClosing(accounts, [{ accountId: "uv", counted: 750_000, justification: null }], 0)).toMatchObject({
      ok: false,
      accountId: "cash",
    })
    const withIntruder = planClosing(
      accounts,
      [
        { accountId: "uv", counted: 750_000, justification: null },
        { accountId: "cash", counted: 50_000, justification: null },
        { accountId: "other", counted: 1, justification: null },
      ],
      0,
    )
    expect(withIntruder.ok).toBe(false)
  })

  it("refuses negative or fractional counts, and duplicates", () => {
    const base = { accountId: "uv", counted: 750_000, justification: null }
    expect(planClosing(accounts, [base, { accountId: "cash", counted: -1, justification: null }], 0).ok).toBe(false)
    expect(planClosing(accounts, [base, { accountId: "cash", counted: 10.5, justification: null }], 0).ok).toBe(false)
    expect(planClosing(accounts, [base, base], 0).ok).toBe(false)
  })
})
