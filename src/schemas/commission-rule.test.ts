import { describe, expect, it } from "vitest"

import { ruleFieldsSchema, type RuleFieldsInput } from "@/schemas/commission-rule"

const valid: RuleFieldsInput = {
  operatorId: "op",
  type: "WITHDRAWAL",
  minAmount: 50_001,
  maxAmount: 500_000,
  fixedFee: 0,
  percentage: 50,
  minCommission: null,
  cap: 1_500,
  feeFixed: 0,
  feePercentage: 0,
}

const errorOn = (value: unknown) => {
  const result = ruleFieldsSchema.safeParse(value)
  return result.success ? null : result.error.issues[0]?.path.join(".")
}

describe("ruleFieldsSchema", () => {
  it("accepts a valid rule", () => {
    expect(errorOn(valid)).toBeNull()
  })

  it("refuses a range whose maximum is below its minimum", () => {
    expect(errorOn({ ...valid, maxAmount: 1_000 })).toBe("maxAmount")
  })

  it("accepts a single-amount range", () => {
    expect(errorOn({ ...valid, minAmount: 5_000, maxAmount: 5_000 })).toBeNull()
  })

  it("refuses a cap below the minimum commission", () => {
    expect(errorOn({ ...valid, minCommission: 2_000, cap: 1_500 })).toBe("cap")
  })

  it("refuses fractional amounts and percentages, and more than 100 %", () => {
    expect(errorOn({ ...valid, fixedFee: 10.5 })).toBe("fixedFee")
    expect(errorOn({ ...valid, percentage: 12.5 })).toBe("percentage")
    expect(errorOn({ ...valid, percentage: Number.NaN })).toBe("percentage")
    expect(errorOn({ ...valid, feePercentage: 10_001 })).toBe("feePercentage")
  })

  it("refuses an unknown operation type", () => {
    expect(errorOn({ ...valid, type: "LOAN" })).toBe("type")
  })

  it("drops an organization id sent by the client", () => {
    const parsed = ruleFieldsSchema.parse({ ...valid, organizationId: "org_evil" })
    expect("organizationId" in parsed).toBe(false)
  })
})
