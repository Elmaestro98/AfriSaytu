import { describe, expect, it } from "vitest"

import { onboardingSchema } from "@/schemas/onboarding"

const valid = {
  organizationName: "Groupe Diop",
  branchName: "Kiosque Médina",
  operators: [{ operatorId: "op_wave", openingBalance: 500_000, alertThreshold: 100_000 }],
  cash: { openingBalance: 300_000, alertThreshold: 50_000 },
}

describe("onboardingSchema", () => {
  it("accepts a complete form", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true)
  })

  it("trims names", () => {
    const result = onboardingSchema.parse({ ...valid, organizationName: "  Groupe Diop  " })
    expect(result.organizationName).toBe("Groupe Diop")
  })

  it("rejects names that are too short", () => {
    expect(onboardingSchema.safeParse({ ...valid, organizationName: "A" }).success).toBe(false)
    expect(onboardingSchema.safeParse({ ...valid, branchName: " " }).success).toBe(false)
  })

  it("requires at least one operator", () => {
    expect(onboardingSchema.safeParse({ ...valid, operators: [] }).success).toBe(false)
  })

  it("rejects the same operator chosen twice", () => {
    const operator = valid.operators[0]
    expect(onboardingSchema.safeParse({ ...valid, operators: [operator, operator] }).success).toBe(false)
  })

  it("rejects amounts that are not whole, negative, or absurdly large", () => {
    const withBalance = (openingBalance: number) => ({
      ...valid,
      cash: { ...valid.cash, openingBalance },
    })
    expect(onboardingSchema.safeParse(withBalance(1000.5)).success).toBe(false)
    expect(onboardingSchema.safeParse(withBalance(-1)).success).toBe(false)
    expect(onboardingSchema.safeParse(withBalance(2_000_000_000)).success).toBe(false)
    expect(onboardingSchema.safeParse(withBalance(Number.NaN)).success).toBe(false)
  })

  it("does not accept an organization id from the client", () => {
    const parsed = onboardingSchema.parse({ ...valid, organizationId: "org_evil" })
    expect("organizationId" in parsed).toBe(false)
  })
})
