import { describe, expect, it } from "vitest"

import { computeCommission, computeFee, divideRounded, type RuleAmounts } from "@/server/commissions/compute"

const base: RuleAmounts = {
  fixedFee: 0,
  percentage: 0,
  minCommission: null,
  cap: null,
  feeFixed: 0,
  feePercentage: 0,
}

describe("divideRounded", () => {
  it("rounds down, to nearest (half up) and up", () => {
    expect(divideRounded(15, 10, "FLOOR")).toBe(1)
    expect(divideRounded(15, 10, "NEAREST")).toBe(2)
    expect(divideRounded(14, 10, "NEAREST")).toBe(1)
    expect(divideRounded(11, 10, "CEIL")).toBe(2)
  })

  it("does not move exact results", () => {
    for (const mode of ["FLOOR", "NEAREST", "CEIL"] as const) {
      expect(divideRounded(6_000_000, 10_000, mode)).toBe(600)
    }
  })

  it("refuses non-integers and negatives", () => {
    expect(() => divideRounded(1.5, 10, "FLOOR")).toThrow(RangeError)
    expect(() => divideRounded(-1, 10, "FLOOR")).toThrow(RangeError)
    expect(() => divideRounded(1, 0, "FLOOR")).toThrow(RangeError)
  })

  it("stays exact on large amounts", () => {
    // 999 999 999 FCFA at 0.01 %: 99 999.9999 -> 99 999 / 100 000
    expect(divideRounded(999_999_999, 10_000, "FLOOR")).toBe(99_999)
    expect(divideRounded(999_999_999, 10_000, "CEIL")).toBe(100_000)
  })
})

describe("computeCommission", () => {
  it("adds a fixed part and a percentage", () => {
    expect(computeCommission(100_000, { ...base, fixedFee: 50, percentage: 100 }, "NEAREST")).toBe(1_050)
  })

  it("applies the minimum", () => {
    expect(computeCommission(1_000, { ...base, percentage: 50, minCommission: 25 }, "NEAREST")).toBe(25)
  })

  it("applies the cap", () => {
    expect(computeCommission(400_000, { ...base, percentage: 50, cap: 1_500 }, "NEAREST")).toBe(1_500)
  })

  it("follows the rounding rule of the organization", () => {
    // 12 345 x 0.5 % = 61.725
    const rule = { ...base, percentage: 50 }
    expect(computeCommission(12_345, rule, "FLOOR")).toBe(61)
    expect(computeCommission(12_345, rule, "NEAREST")).toBe(62)
    expect(computeCommission(12_345, rule, "CEIL")).toBe(62)
  })

  it("gives the same result whether rounding happens before or after the bounds", () => {
    // 1 500.4 capped at 1 500 must stay 1 500 even when rounding up
    expect(computeCommission(300_080, { ...base, percentage: 50, cap: 1_500 }, "CEIL")).toBe(1_500)
    // 99.6 with a minimum of 100 must be 100 even when rounding down
    expect(computeCommission(19_920, { ...base, percentage: 50, minCommission: 100 }, "FLOOR")).toBe(100)
  })
})

describe("computeFee", () => {
  it("is computed separately from the commission", () => {
    const rule = { ...base, fixedFee: 100, feeFixed: 200, feePercentage: 100 }
    expect(computeFee(50_000, rule, "NEAREST")).toBe(700)
    expect(computeCommission(50_000, rule, "NEAREST")).toBe(100)
  })
})
