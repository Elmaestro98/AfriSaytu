import { describe, expect, it } from "vitest"

import { PLAN_MONTHLY_PRICE, canAddBranch, canAddMember, yearlyPrice } from "@/server/plans/limits"

describe("branch limits", () => {
  it("allows one branch on Basic and Pro", () => {
    expect(canAddBranch("BASIC", 0)).toBe(true)
    expect(canAddBranch("BASIC", 1)).toBe(false)
    expect(canAddBranch("PRO", 0)).toBe(true)
    expect(canAddBranch("PRO", 1)).toBe(false)
  })

  it("allows up to five branches on Business", () => {
    expect(canAddBranch("BUSINESS", 4)).toBe(true)
    expect(canAddBranch("BUSINESS", 5)).toBe(false)
  })
})

describe("member limits", () => {
  it("allows a single user on Basic", () => {
    expect(canAddMember("BASIC", 1)).toBe(false)
  })

  it("allows up to five users on Pro", () => {
    expect(canAddMember("PRO", 4)).toBe(true)
    expect(canAddMember("PRO", 5)).toBe(false)
  })

  it("has no user limit on Business", () => {
    expect(canAddMember("BUSINESS", 10_000)).toBe(true)
  })
})

describe("plan offer", () => {
  it("has whole FCFA prices that grow with the plan", () => {
    const prices = [PLAN_MONTHLY_PRICE.BASIC, PLAN_MONTHLY_PRICE.PRO, PLAN_MONTHLY_PRICE.BUSINESS]
    expect(prices.every(Number.isSafeInteger)).toBe(true)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
  })

  it("gives 2 months free on a yearly payment", () => {
    expect(yearlyPrice("PRO")).toBe(50_000)
    expect(yearlyPrice("BASIC")).toBe(25_000)
  })
})
