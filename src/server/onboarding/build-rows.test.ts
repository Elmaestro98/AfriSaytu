import { describe, expect, it } from "vitest"

import { AccountKind, LedgerReason, Role, SubscriptionStatus } from "@/generated/prisma/enums"
import type { OnboardingInput } from "@/schemas/onboarding"
import {
  TRIAL_DAYS,
  UnknownOperatorError,
  buildProvisioningRows,
  type ProvisioningContext,
} from "@/server/onboarding/build-rows"

const NOW = new Date("2026-09-25T10:00:00.000Z")

function makeContext(): ProvisioningContext {
  let counter = 0
  return {
    clerkOrgId: "org_clerk_1",
    clerkUserId: "user_clerk_1",
    memberName: "Moussa Diop",
    operators: [
      { id: "op_wave", name: "Wave" },
      { id: "op_om", name: "Orange Money" },
      { id: "op_mixx", name: "Mixx by Yas" },
    ],
    now: NOW,
    newId: () => `id_${++counter}`,
  }
}

const input: OnboardingInput = {
  organizationName: "Groupe Diop",
  branchName: "Kiosque Médina",
  branchAddress: "Dakar",
  operators: [
    { operatorId: "op_wave", accountNumber: "771234567", openingBalance: 1_250_000, alertThreshold: 300_000 },
    { operatorId: "op_om", accountNumber: "", openingBalance: 850_000, alertThreshold: 400_000 },
    { operatorId: "op_mixx", openingBalance: 0, alertThreshold: 500_000 },
  ],
  cash: { openingBalance: 650_000, alertThreshold: 100_000 },
}

describe("buildProvisioningRows", () => {
  it("creates one operator account per chosen operator plus one cash drawer", () => {
    const rows = buildProvisioningRows(input, makeContext())

    const operatorAccounts = rows.accounts.filter((account) => account.kind === AccountKind.OPERATOR)
    const cashAccounts = rows.accounts.filter((account) => account.kind === AccountKind.CASH)
    expect(operatorAccounts.map((account) => account.label)).toEqual(["Wave", "Orange Money", "Mixx by Yas"])
    expect(cashAccounts).toHaveLength(1)
    expect(cashAccounts[0].operatorId).toBeNull()
    expect(rows.orgOperators).toHaveLength(3)
  })

  it("writes opening balances as the first ledger line, and none for a zero balance", () => {
    const rows = buildProvisioningRows(input, makeContext())

    // Mixx has a zero balance: 2 operator lines + 1 cash line
    expect(rows.ledgerEntries).toHaveLength(3)
    for (const entry of rows.ledgerEntries) {
      expect(entry.reason).toBe(LedgerReason.OPENING)
      expect(entry.delta).toBeGreaterThan(0)
    }
  })

  it("keeps the ledger equal to the balances entered (sum of lines = opening balance)", () => {
    const rows = buildProvisioningRows(input, makeContext())

    const sumFor = (accountId: string) =>
      rows.ledgerEntries.filter((entry) => entry.accountId === accountId).reduce((sum, entry) => sum + entry.delta, 0)

    const wave = rows.accounts.find((account) => account.label === "Wave")!
    const cash = rows.accounts.find((account) => account.kind === AccountKind.CASH)!
    const mixx = rows.accounts.find((account) => account.label === "Mixx by Yas")!
    expect(sumFor(wave.id as string)).toBe(1_250_000)
    expect(sumFor(cash.id as string)).toBe(650_000)
    expect(sumFor(mixx.id as string)).toBe(0)
  })

  it("attaches every row to the same new organization", () => {
    const rows = buildProvisioningRows(input, makeContext())
    const organizationId = rows.organization.id as string

    const children = [
      rows.member,
      rows.branch,
      rows.memberBranch,
      rows.subscription,
      ...rows.orgOperators,
      ...rows.accounts,
      ...rows.ledgerEntries,
    ]
    for (const row of children) {
      expect(row.organizationId).toBe(organizationId)
    }
  })

  it("generates unique ids for every row", () => {
    const rows = buildProvisioningRows(input, makeContext())
    const ids = [
      rows.organization.id,
      rows.member.id,
      rows.branch.id,
      rows.memberBranch.id,
      rows.subscription.id,
      ...rows.orgOperators.map((row) => row.id),
      ...rows.accounts.map((row) => row.id),
      ...rows.ledgerEntries.map((row) => row.id),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("makes the creator the owner of the organization and links them to the branch", () => {
    const rows = buildProvisioningRows(input, makeContext())

    expect(rows.member.role).toBe(Role.OWNER)
    expect(rows.member.clerkUserId).toBe("user_clerk_1")
    expect(rows.organization.clerkOrgId).toBe("org_clerk_1")
    expect(rows.memberBranch.memberId).toBe(rows.member.id)
    expect(rows.memberBranch.branchId).toBe(rows.branch.id)
  })

  it("starts a 7-day trial", () => {
    const rows = buildProvisioningRows(input, makeContext())
    const expectedEnd = new Date(NOW.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

    expect(TRIAL_DAYS).toBe(7)
    expect(rows.subscription.status).toBe(SubscriptionStatus.TRIAL)
    expect(rows.subscription.trialEndsAt).toEqual(expectedEnd)
  })

  it("stores empty optional fields as null", () => {
    const rows = buildProvisioningRows(
      { ...input, branchAddress: "" },
      makeContext(),
    )
    const orange = rows.accounts.find((account) => account.label === "Orange Money")!
    const mixx = rows.accounts.find((account) => account.label === "Mixx by Yas")!

    expect(rows.branch.address).toBeNull()
    expect(orange.accountNumber).toBeNull()
    expect(mixx.accountNumber).toBeNull()
  })

  it("refuses an operator that is not in the active catalogue", () => {
    const bad: OnboardingInput = {
      ...input,
      operators: [{ operatorId: "op_unknown", openingBalance: 0, alertThreshold: 0 }],
    }
    expect(() => buildProvisioningRows(bad, makeContext())).toThrow(UnknownOperatorError)
  })
})
