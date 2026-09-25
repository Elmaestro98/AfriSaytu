import { describe, expect, it } from "vitest"

import { PLAN_MONTHLY_PRICE, canAddBranch, canAddMember, historyStart, isPayableMonths, subscriptionPrice, yearlyPrice } from "@/server/plans/limits"

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
    expect(yearlyPrice("BASIC")).toBe(50_000)
    expect(yearlyPrice("PRO")).toBe(70_000)
    expect(yearlyPrice("BUSINESS")).toBe(100_000)
  })
})

describe("historyStart", () => {
  const now = new Date("2026-09-25T15:00:00.000Z")

  it("shows 3 months on Basic, from Dakar midnight", () => {
    expect(historyStart("BASIC", now)).toEqual(new Date("2026-06-25T00:00:00.000Z"))
  })

  it("shows 24 months on Pro, across years", () => {
    expect(historyStart("PRO", now)).toEqual(new Date("2024-09-25T00:00:00.000Z"))
  })

  it("shows everything on Business", () => {
    expect(historyStart("BUSINESS", now)).toBeNull()
  })

  it("clamps to the end of a shorter month", () => {
    expect(historyStart("BASIC", new Date("2026-05-31T09:00:00.000Z"))).toEqual(new Date("2026-02-28T00:00:00.000Z"))
    expect(historyStart("BASIC", new Date("2028-05-31T09:00:00.000Z"))).toEqual(new Date("2028-02-29T00:00:00.000Z"))
  })

  it("crosses the start of the year", () => {
    expect(historyStart("BASIC", new Date("2027-01-15T23:59:00.000Z"))).toEqual(new Date("2026-10-15T00:00:00.000Z"))
  })
})

describe("subscriptionPrice", () => {
  it("multiplies the monthly price, and gives 2 months free on a year", () => {
    expect(subscriptionPrice("BASIC", 1)).toBe(5_000)
    expect(subscriptionPrice("PRO", 1)).toBe(7_000)
    expect(subscriptionPrice("PRO", 3)).toBe(21_000)
    expect(subscriptionPrice("BASIC", 6)).toBe(30_000)
    expect(subscriptionPrice("BUSINESS", 12)).toBe(100_000)
  })

  it("only accepts the offered durations", () => {
    expect([1, 3, 6, 12].every(isPayableMonths)).toBe(true)
    expect([0, 2, 24, 1.5].some(isPayableMonths)).toBe(false)
  })
})
