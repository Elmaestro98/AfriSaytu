import { describe, expect, it } from "vitest"

import { findOverlap, findRule, quoteOperation, type Rule } from "@/server/commissions/resolve"

const JAN = new Date("2026-01-01T00:00:00.000Z")
const NOW = new Date("2026-09-25T10:00:00.000Z")

function rule(overrides: Partial<Rule>): Rule {
  return {
    id: "r",
    operatorId: "op_x",
    type: "WITHDRAWAL",
    minAmount: 0,
    maxAmount: 0,
    validFrom: JAN,
    validTo: null,
    isActive: true,
    fixedFee: 0,
    percentage: 0,
    minCommission: null,
    cap: null,
    feeFixed: 0,
    feePercentage: 0,
    ...overrides,
  }
}

// Annexe B.1 of the cahier des charges (fictitious values, not operator tariffs).
const ANNEX_B = [
  rule({ id: "t1", minAmount: 1_000, maxAmount: 50_000, fixedFee: 100 }),
  rule({ id: "t2", minAmount: 50_001, maxAmount: 500_000, percentage: 50, cap: 1_500 }),
]

const at = (amount: number) => ({ operatorId: "op_x", type: "WITHDRAWAL" as const, amount, at: NOW })

describe("Annexe B.1", () => {
  it.each([
    [20_000, 100, "t1"],
    [120_000, 600, "t2"],
    [400_000, 1_500, "t2"],
  ])("withdrawal of %i gives a commission of %i", (amount, commission, ruleId) => {
    expect(quoteOperation(ANNEX_B, at(amount), "NEAREST")).toEqual({
      commissionRuleId: ruleId,
      commission,
      fee: 0,
      noRule: false,
    })
  })

  it("gives 0 and flags 'sans règle' above the last range", () => {
    expect(quoteOperation(ANNEX_B, at(750_000), "NEAREST")).toEqual({
      commissionRuleId: null,
      commission: 0,
      fee: 0,
      noRule: true,
    })
  })
})

describe("findRule", () => {
  it("includes both ends of a range", () => {
    expect(findRule(ANNEX_B, at(1_000))?.id).toBe("t1")
    expect(findRule(ANNEX_B, at(50_000))?.id).toBe("t1")
    expect(findRule(ANNEX_B, at(50_001))?.id).toBe("t2")
    expect(findRule(ANNEX_B, at(500_000))?.id).toBe("t2")
    expect(findRule(ANNEX_B, at(999))).toBeNull()
  })

  it("ignores another operator, another type and inactive rules", () => {
    expect(findRule(ANNEX_B, { ...at(20_000), operatorId: "op_y" })).toBeNull()
    expect(findRule(ANNEX_B, { ...at(20_000), type: "DEPOSIT" })).toBeNull()
    expect(findRule([{ ...ANNEX_B[0], isActive: false }], at(20_000))).toBeNull()
  })

  it("uses the version in force at the time of the operation", () => {
    const change = new Date("2026-06-01T00:00:00.000Z")
    const rules = [
      rule({ id: "old", minAmount: 0, maxAmount: 100_000, fixedFee: 100, validTo: change }),
      rule({ id: "new", minAmount: 0, maxAmount: 100_000, fixedFee: 150, validFrom: change }),
    ]
    expect(findRule(rules, { ...at(10_000), at: new Date("2026-03-01T00:00:00.000Z") })?.id).toBe("old")
    expect(findRule(rules, { ...at(10_000), at: change })?.id).toBe("new")
    expect(findRule(rules, at(10_000))?.id).toBe("new")
  })

  it("ignores a rule that is not yet in force", () => {
    expect(findRule([rule({ minAmount: 0, maxAmount: 10, validFrom: new Date("2027-01-01") })], at(5))).toBeNull()
  })
})

describe("findOverlap", () => {
  const candidate = (minAmount: number, maxAmount: number) =>
    rule({ id: "new", minAmount, maxAmount, validFrom: NOW })

  it("detects ranges that share an amount", () => {
    expect(findOverlap(candidate(50_000, 60_000), ANNEX_B)?.id).toBe("t1")
    expect(findOverlap(candidate(500_000, 900_000), ANNEX_B)?.id).toBe("t2")
    expect(findOverlap(candidate(0, 2_000_000), ANNEX_B)).not.toBeNull()
  })

  it("accepts a range that touches none", () => {
    expect(findOverlap(candidate(500_001, 1_000_000), ANNEX_B)).toBeNull()
    expect(findOverlap(candidate(0, 999), ANNEX_B)).toBeNull()
  })

  it("ignores another operator or type, and closed or inactive rules", () => {
    expect(findOverlap({ ...candidate(1_000, 2_000), operatorId: "op_y" }, ANNEX_B)).toBeNull()
    expect(findOverlap({ ...candidate(1_000, 2_000), type: "DEPOSIT" }, ANNEX_B)).toBeNull()
    expect(findOverlap(candidate(1_000, 2_000), [{ ...ANNEX_B[0], validTo: NOW }])).toBeNull()
    expect(findOverlap(candidate(1_000, 2_000), [{ ...ANNEX_B[0], isActive: false }])).toBeNull()
  })
})
