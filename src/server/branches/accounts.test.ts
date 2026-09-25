import { describe, expect, it } from "vitest"

import { AccountKind, LedgerReason } from "@/generated/prisma/enums"
import { UnknownOperatorError, buildBranchAccounts } from "@/server/branches/accounts"

function params() {
  let counter = 0
  return {
    organizationId: "org",
    branchId: "branch",
    memberId: "member",
    catalog: [{ id: "op_wave", name: "Wave" }],
    newId: () => `id_${++counter}`,
  }
}

describe("buildBranchAccounts", () => {
  it("adds a single operator account without a cash drawer", () => {
    const result = buildBranchAccounts({
      ...params(),
      operators: [{ operatorId: "op_wave", openingBalance: 200_000, alertThreshold: 50_000 }],
    })

    expect(result.accounts).toHaveLength(1)
    expect(result.accounts[0].kind).toBe(AccountKind.OPERATOR)
    expect(result.ledgerEntries).toEqual([
      expect.objectContaining({ reason: LedgerReason.OPENING, delta: 200_000, accountId: result.accounts[0].id }),
    ])
  })

  it("writes no ledger line for a zero opening balance", () => {
    const result = buildBranchAccounts({
      ...params(),
      operators: [{ operatorId: "op_wave", openingBalance: 0, alertThreshold: 0 }],
      cash: { openingBalance: 0, alertThreshold: 0 },
    })
    expect(result.accounts).toHaveLength(2)
    expect(result.ledgerEntries).toHaveLength(0)
  })

  it("trims the account number and stores a blank one as null", () => {
    const result = buildBranchAccounts({
      ...params(),
      operators: [{ operatorId: "op_wave", accountNumber: "   ", openingBalance: 0, alertThreshold: 0 }],
    })
    expect(result.accounts[0].accountNumber).toBeNull()
  })

  it("refuses an operator the organization cannot use", () => {
    expect(() =>
      buildBranchAccounts({
        ...params(),
        operators: [{ operatorId: "op_other", openingBalance: 0, alertThreshold: 0 }],
      }),
    ).toThrow(UnknownOperatorError)
  })
})
