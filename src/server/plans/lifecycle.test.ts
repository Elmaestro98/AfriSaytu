import { describe, expect, it } from "vitest"

import { GRACE_DAYS, READ_ONLY_ERROR, SUSPENDED_ERROR, subscriptionState, writeRefusal } from "@/server/plans/lifecycle"

const DAY = 24 * 60 * 60 * 1000
const END = new Date("2026-10-01T10:00:00.000Z")
const at = (offsetMs: number) => new Date(END.getTime() + offsetMs)

const trial = { status: "TRIAL" as const, trialEndsAt: END, currentPeriodEnd: null }
const paid = { status: "ACTIVE" as const, trialEndsAt: null, currentPeriodEnd: END }

describe("subscriptionState: trial", () => {
  it("is a running trial with full access before its end", () => {
    const state = subscriptionState(trial, at(-3 * DAY + 60_000))
    expect(state).toMatchObject({ status: "TRIAL", access: "FULL", fromTrial: true, deadline: END, daysLeft: 3 })
  })

  it("counts a started day as a day left", () => {
    expect(subscriptionState(trial, at(-60_000)).daysLeft).toBe(1)
  })

  it("enters 7 days of grace the second it ends, still with full access", () => {
    const state = subscriptionState(trial, END)
    expect(state).toMatchObject({ status: "PAST_DUE", access: "FULL", fromTrial: true, daysLeft: GRACE_DAYS })
    expect(state.deadline).toEqual(at(GRACE_DAYS * DAY))
  })

  it("becomes read only when the grace ends", () => {
    expect(subscriptionState(trial, at(GRACE_DAYS * DAY - 1)).access).toBe("FULL")
    expect(subscriptionState(trial, at(GRACE_DAYS * DAY))).toMatchObject({ status: "READ_ONLY", access: "READ_ONLY", fromTrial: true })
  })

  it("stays read only long after, never suspended automatically", () => {
    expect(subscriptionState(trial, at(1_000 * DAY)).status).toBe("READ_ONLY")
  })
})

describe("subscriptionState: paid period", () => {
  it("is active until the end of the paid period", () => {
    expect(subscriptionState(paid, at(-DAY))).toMatchObject({ status: "ACTIVE", access: "FULL", fromTrial: false })
  })

  it("follows the same grace then read only", () => {
    expect(subscriptionState(paid, at(DAY)).status).toBe("PAST_DUE")
    expect(subscriptionState(paid, at(GRACE_DAYS * DAY)).status).toBe("READ_ONLY")
  })

  it("reads the stored PAST_DUE with the dates, like ACTIVE", () => {
    expect(subscriptionState({ ...paid, status: "PAST_DUE" }, at(-DAY)).status).toBe("ACTIVE")
    expect(subscriptionState({ ...paid, status: "PAST_DUE" }, at(DAY)).status).toBe("PAST_DUE")
  })

  it("has full access without deadline when no end date is set", () => {
    expect(subscriptionState({ ...paid, currentPeriodEnd: null }, at(500 * DAY))).toMatchObject({ access: "FULL", deadline: null })
  })
})

describe("subscriptionState: manual decisions", () => {
  it("blocks a suspended organization whatever its dates", () => {
    expect(subscriptionState({ ...paid, status: "SUSPENDED" }, at(-10 * DAY))).toMatchObject({ status: "SUSPENDED", access: "BLOCKED" })
  })

  it("keeps a forced read only whatever its dates", () => {
    expect(subscriptionState({ ...paid, status: "READ_ONLY" }, at(-10 * DAY)).access).toBe("READ_ONLY")
  })

  it("keeps the data readable when the subscription is missing", () => {
    expect(subscriptionState(null, END).access).toBe("READ_ONLY")
  })
})

describe("writeRefusal", () => {
  it("lets a full access write", () => {
    expect(writeRefusal(subscriptionState(trial, at(-DAY)))).toBeNull()
    expect(writeRefusal(subscriptionState(trial, at(DAY)))).toBeNull() // grace
  })

  it("refuses with a French message in read only and when suspended", () => {
    expect(writeRefusal(subscriptionState(trial, at(30 * DAY)))).toEqual({ ok: false, error: READ_ONLY_ERROR })
    expect(writeRefusal(subscriptionState({ ...paid, status: "SUSPENDED" }, END))).toEqual({ ok: false, error: SUSPENDED_ERROR })
  })
})
