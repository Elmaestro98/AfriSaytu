import { describe, expect, it } from "vitest"

import { checkPayout, defaultPayoutMonth } from "@/server/cash/payout"

const NOW = new Date("2026-10-03T10:00:00.000Z")

describe("checkPayout", () => {
  it("accepts a payout of the operator on its own UV account, or in cash", () => {
    expect(checkPayout({ operatorId: "wave", payoutMonth: "2026-09", accountOperatorId: "wave" }, NOW)).toEqual({ ok: true, operatorId: "wave", payoutMonth: "2026-09" })
    expect(checkPayout({ operatorId: "om", payoutMonth: "2026-09", accountOperatorId: null }, NOW).ok).toBe(true)
  })

  it("refuses a payout received on another operator's account", () => {
    expect(checkPayout({ operatorId: "om", payoutMonth: "2026-09", accountOperatorId: "wave" }, NOW).ok).toBe(false)
  })

  it("requires the operator and a valid month, neither future nor older than a year", () => {
    expect(checkPayout({ operatorId: null, payoutMonth: "2026-09", accountOperatorId: null }, NOW).ok).toBe(false)
    expect(checkPayout({ operatorId: "wave", payoutMonth: "2026-9", accountOperatorId: null }, NOW).ok).toBe(false)
    expect(checkPayout({ operatorId: "wave", payoutMonth: "2026-11", accountOperatorId: null }, NOW).ok).toBe(false)
    expect(checkPayout({ operatorId: "wave", payoutMonth: "2025-09", accountOperatorId: null }, NOW).ok).toBe(false)
    expect(checkPayout({ operatorId: "wave", payoutMonth: "2025-10", accountOperatorId: null }, NOW).ok).toBe(true)
  })
})

describe("defaultPayoutMonth", () => {
  it("is the previous month, across years", () => {
    expect(defaultPayoutMonth(NOW)).toBe("2026-09")
    expect(defaultPayoutMonth(new Date("2027-01-02T08:00:00.000Z"))).toBe("2026-12")
  })
})
