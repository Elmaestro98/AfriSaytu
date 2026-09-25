import { describe, expect, it } from "vitest"

import { describeCommission, describeFee, describeRange } from "@/lib/format-rule"

const S = " "
const rule = {
  minAmount: 50_001,
  maxAmount: 500_000,
  fixedFee: 0,
  percentage: 50,
  minCommission: null,
  cap: 1_500,
  feeFixed: 0,
  feePercentage: 0,
}

describe("rule descriptions", () => {
  it("describes the range", () => {
    expect(describeRange(rule)).toBe(`De 50${S}001${S}FCFA à 500${S}000${S}FCFA`)
  })

  it("describes the commission with its bounds", () => {
    expect(describeCommission(rule)).toBe(`0,5${S}% (plafond 1${S}500${S}FCFA)`)
    expect(describeCommission({ ...rule, fixedFee: 100, percentage: 0, cap: null })).toBe(`100${S}FCFA`)
    expect(describeCommission({ ...rule, fixedFee: 50, minCommission: 100 })).toBe(
      `50${S}FCFA + 0,5${S}% (min. 100${S}FCFA, plafond 1${S}500${S}FCFA)`,
    )
  })

  it("says when there is no customer fee", () => {
    expect(describeFee(rule)).toBe("Aucun")
    expect(describeFee({ ...rule, feeFixed: 200, feePercentage: 100 })).toBe(`200${S}FCFA + 1${S}%`)
  })
})
