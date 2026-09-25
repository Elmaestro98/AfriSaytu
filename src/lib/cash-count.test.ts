import { describe, expect, it } from "vitest"

import { cashCountTotal, cleanCashCount } from "@/lib/cash-count"

describe("cash count", () => {
  it("adds up the mockup 05 count: 650 000 FCFA", () => {
    expect(cashCountTotal({ B10000: 45, B5000: 28, B2000: 20, B1000: 15, B500: 10 })).toBe(650_000)
  })

  it("counts coins, with 500 F notes and coins apart", () => {
    expect(cashCountTotal({ B500: 2, P500: 3, P250: 1, P25: 2, P5: 1 })).toBe(2_805)
  })

  it("is 0 for an empty drawer", () => {
    expect(cashCountTotal({})).toBe(0)
  })

  it("ignores unknown denominations and invalid quantities", () => {
    expect(cleanCashCount({ B10000: 2, B20000: 5, P100: -3, P50: 1.5, P25: Number.NaN, P10: 0 })).toEqual({ B10000: 2 })
    expect(cashCountTotal({ B10000: 2, B20000: 5, P100: -3 })).toBe(20_000)
  })
})
