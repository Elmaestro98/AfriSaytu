import { describe, expect, it } from "vitest"

import { formatPercent, formatPercentNumber, parsePercent } from "@/lib/percent"

describe("parsePercent", () => {
  it("reads French and English decimals as basis points", () => {
    expect(parsePercent("0,5")).toBe(50)
    expect(parsePercent("1.25")).toBe(125)
    expect(parsePercent("2")).toBe(200)
    expect(parsePercent("0,05")).toBe(5)
    expect(parsePercent("0,1")).toBe(10)
    expect(parsePercent(" 1,5 % ")).toBe(150)
    expect(parsePercent("100")).toBe(10_000)
  })

  it("returns null for an empty field", () => {
    expect(parsePercent("")).toBeNull()
    expect(parsePercent("  ")).toBeNull()
  })

  it("rejects more than 2 decimals, text, negatives and more than 100 %", () => {
    for (const value of ["0,125", "abc", "-1", "100,01", "150", "1,2,3", ","]) {
      expect(parsePercent(value)).toBeNaN()
    }
  })
})

describe("formatPercent", () => {
  it("formats basis points back to a French percentage", () => {
    expect(formatPercentNumber(50)).toBe("0,5")
    expect(formatPercentNumber(125)).toBe("1,25")
    expect(formatPercentNumber(200)).toBe("2")
    expect(formatPercentNumber(5)).toBe("0,05")
    expect(formatPercent(150)).toBe("1,5 %")
  })

  it("round-trips", () => {
    for (const basisPoints of [0, 1, 5, 10, 50, 99, 100, 125, 1_000, 10_000]) {
      expect(parsePercent(formatPercentNumber(basisPoints))).toBe(basisPoints)
    }
  })
})
