import { describe, expect, it } from "vitest"

import { applyPayment, changePlan, extendTrial, reactivate, suspend, type CurrentSubscription } from "@/server/admin/subscription-changes"
import { subscriptionState } from "@/server/plans/lifecycle"

const NOW = new Date("2026-09-25T10:00:00.000Z")
const DAY = 24 * 60 * 60 * 1000

const trial: CurrentSubscription = { plan: "PRO", status: "TRIAL", trialEndsAt: new Date("2026-09-28T10:00:00.000Z"), currentPeriodEnd: null }
const paid: CurrentSubscription = { plan: "BASIC", status: "ACTIVE", trialEndsAt: null, currentPeriodEnd: new Date("2026-10-31T00:00:00.000Z") }

function next(result: ReturnType<typeof extendTrial>) {
  if (!result.ok) throw new Error(result.error)
  return result.next
}

describe("extendTrial", () => {
  it("adds days to a running trial, from its end", () => {
    expect(next(extendTrial(trial, 7, NOW)).trialEndsAt).toEqual(new Date("2026-10-05T10:00:00.000Z"))
  })

  it("restarts from today when the trial already ended, so the client is back to full access", () => {
    const ended = { ...trial, trialEndsAt: new Date(NOW.getTime() - 20 * DAY) }
    const result = next(extendTrial(ended, 5, NOW))
    expect(result.trialEndsAt).toEqual(new Date(NOW.getTime() + 5 * DAY))
    expect(subscriptionState(result, NOW).access).toBe("FULL")
  })

  it("refuses a client who already paid, a suspended one, and silly durations", () => {
    expect(extendTrial(paid, 7, NOW).ok).toBe(false)
    expect(extendTrial({ ...trial, status: "SUSPENDED" }, 7, NOW).ok).toBe(false)
    for (const days of [0, -3, 1.5, 91]) expect(extendTrial(trial, days, NOW).ok).toBe(false)
  })
})

describe("applyPayment", () => {
  it("ends a trial and starts a paid period from today", () => {
    const result = next(applyPayment(trial, 1, NOW))
    expect(result).toMatchObject({ status: "ACTIVE", currentPeriodEnd: new Date("2026-10-25T10:00:00.000Z") })
  })

  it("adds months after the paid period still running, month end clamped", () => {
    expect(next(applyPayment(paid, 4, NOW)).currentPeriodEnd).toEqual(new Date("2027-02-28T00:00:00.000Z"))
  })

  it("brings a read-only client back to full access", () => {
    const expired = { ...paid, currentPeriodEnd: new Date(NOW.getTime() - 30 * DAY) }
    expect(subscriptionState(expired, NOW).access).toBe("READ_ONLY")
    expect(subscriptionState(next(applyPayment(expired, 1, NOW)), NOW).access).toBe("FULL")
  })

  it("refuses a suspended client and silly durations", () => {
    expect(applyPayment({ ...paid, status: "SUSPENDED" }, 1, NOW).ok).toBe(false)
    for (const months of [0, 25, 2.5]) expect(applyPayment(paid, months, NOW).ok).toBe(false)
  })
})

describe("changePlan, suspend, reactivate", () => {
  it("changes the plan only, and refuses the same plan", () => {
    expect(next(changePlan(paid, "BUSINESS"))).toEqual({ ...paid, plan: "BUSINESS" })
    expect(changePlan(paid, "BASIC").ok).toBe(false)
  })

  it("suspends once and keeps the dates", () => {
    expect(next(suspend(paid))).toEqual({ ...paid, status: "SUSPENDED" })
    expect(suspend({ ...paid, status: "SUSPENDED" }).ok).toBe(false)
  })

  it("reactivates to the status the dates give", () => {
    expect(next(reactivate({ ...paid, status: "SUSPENDED" })).status).toBe("ACTIVE")
    expect(next(reactivate({ ...trial, status: "READ_ONLY" })).status).toBe("TRIAL")
    expect(reactivate(paid).ok).toBe(false)
  })
})
