import { describe, expect, it } from "vitest"

import type { Rule } from "@/server/commissions/resolve"
import { DEFAULT_EFFECTS } from "@/server/ledger/effects"
import { computeEntry, type EntryAccounts, type EntryInput, type EntrySettings } from "@/server/operations/compute-entry"

const NOW = new Date("2026-09-25T10:00:00.000Z")

const depositRule: Rule = {
  id: "r1",
  operatorId: "op",
  type: "DEPOSIT",
  minAmount: 1,
  maxAmount: 1_000_000,
  validFrom: new Date("2026-01-01"),
  validTo: null,
  isActive: true,
  fixedFee: 0,
  percentage: 100, // 1 %
  minCommission: null,
  cap: null,
  feeFixed: 0,
  feePercentage: 0,
}

const settings: EntrySettings = {
  rules: [depositRule],
  roundingMode: "NEAREST",
  effect: DEFAULT_EFFECTS.DEPOSIT,
  allowManualCommission: false,
  at: NOW,
}

const accounts: EntryAccounts = { uvAccountId: "uv", cashAccountId: "cash", uvBalance: 1_130_000, cashBalance: 650_000 }

const input: EntryInput = {
  operatorId: "op",
  type: "DEPOSIT",
  amount: 25_000,
  fee: null,
  commission: null,
  feeInCash: false,
  manual: null,
}

describe("computeEntry", () => {
  it("quotes the commission and projects both balances (mockup 03)", () => {
    const result = computeEntry(input, settings, accounts)
    expect(result.commission).toBe(250)
    expect(result.quote.commissionRuleId).toBe("r1")
    expect(result.projected).toEqual({ uv: 1_105_000, cash: 675_000 })
    expect(result.goesNegative).toEqual([])
  })

  it("flags an operation without rule", () => {
    const result = computeEntry({ ...input, type: "WITHDRAWAL" }, { ...settings, effect: DEFAULT_EFFECTS.WITHDRAWAL }, accounts)
    expect(result.quote.noRule).toBe(true)
    expect(result.commission).toBe(0)
  })

  it("keeps a fee corrected by the agent and marks it", () => {
    const result = computeEntry({ ...input, fee: 500, feeInCash: true }, settings, accounts)
    expect(result.fee).toBe(500)
    expect(result.feeManual).toBe(true)
    expect(result.projected.cash).toBe(675_500)
  })

  it("does not mark a fee equal to the rule's", () => {
    expect(computeEntry({ ...input, fee: 0 }, settings, accounts).feeManual).toBe(false)
  })

  it("ignores a typed commission unless the manager allows it", () => {
    expect(computeEntry({ ...input, commission: 999 }, settings, accounts).commission).toBe(250)
    const allowed = computeEntry({ ...input, commission: 999 }, { ...settings, allowManualCommission: true }, accounts)
    expect(allowed.commission).toBe(999)
    expect(allowed.commissionManual).toBe(true)
  })

  it("warns when the operation would push a balance below zero", () => {
    const result = computeEntry({ ...input, amount: 2_000_000 }, settings, accounts)
    expect(result.goesNegative).toEqual(["UV"])
    const withdrawal = computeEntry(
      { ...input, type: "WITHDRAWAL", amount: 700_000 },
      { ...settings, effect: DEFAULT_EFFECTS.WITHDRAWAL },
      accounts,
    )
    expect(withdrawal.goesNegative).toEqual(["CASH"])
  })

  it("does not warn when an operation raises a balance that is already negative", () => {
    const result = computeEntry(
      { ...input, type: "WITHDRAWAL", amount: 1_000 },
      { ...settings, effect: DEFAULT_EFFECTS.WITHDRAWAL },
      { ...accounts, uvBalance: -5_000 },
    )
    expect(result.goesNegative).toEqual([])
  })

  it("uses the directions chosen by hand for OTHER", () => {
    const result = computeEntry(
      { ...input, type: "OTHER", manual: { uv: 1, cash: -1 } },
      { ...settings, effect: DEFAULT_EFFECTS.OTHER },
      accounts,
    )
    expect(result.projected).toEqual({ uv: 1_155_000, cash: 625_000 })
  })
})
