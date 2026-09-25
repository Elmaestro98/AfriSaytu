import type { Prisma } from "@/generated/prisma/client"
import { AccountKind, LedgerReason } from "@/generated/prisma/enums"

// Pure: builds the accounts of a branch and their opening ledger lines. No database access.
// Shared by the onboarding and by "new branch" / "add an operator to a branch".

export type CatalogOperator = { id: string; name: string }

export type AccountSetup = {
  operatorId: string
  accountNumber?: string
  openingBalance: number
  alertThreshold: number
}

export type CashSetup = { openingBalance: number; alertThreshold: number }

export type BranchAccountsParams = {
  organizationId: string
  branchId: string
  memberId: string // author of the opening lines
  operators: readonly AccountSetup[]
  cash?: CashSetup // omitted when only adding an operator to an existing branch
  catalog: readonly CatalogOperator[] // operators the organization may use
  newId: () => string
}

export type BranchAccounts = {
  accounts: Prisma.AccountCreateManyInput[]
  ledgerEntries: Prisma.LedgerEntryCreateManyInput[]
}

export class UnknownOperatorError extends Error {
  constructor(operatorId: string) {
    super(`Operator "${operatorId}" is not available to this organization`)
    this.name = "UnknownOperatorError"
  }
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null
}

export function buildBranchAccounts(params: BranchAccountsParams): BranchAccounts {
  const { organizationId, branchId, memberId, newId } = params
  const catalog = new Map(params.catalog.map((operator) => [operator.id, operator]))
  const accounts: Prisma.AccountCreateManyInput[] = []
  const ledgerEntries: Prisma.LedgerEntryCreateManyInput[] = []

  // An opening balance is the first ledger line of the account. A zero balance needs no line.
  const addAccount = (account: Prisma.AccountCreateManyInput & { id: string }, openingBalance: number) => {
    accounts.push(account)
    if (openingBalance > 0) {
      ledgerEntries.push({
        id: newId(),
        organizationId,
        accountId: account.id,
        reason: LedgerReason.OPENING,
        delta: openingBalance,
        memberId,
      })
    }
  }

  for (const setup of params.operators) {
    const operator = catalog.get(setup.operatorId)
    if (!operator) throw new UnknownOperatorError(setup.operatorId)

    addAccount(
      {
        id: newId(),
        organizationId,
        branchId,
        kind: AccountKind.OPERATOR,
        operatorId: operator.id,
        label: operator.name,
        accountNumber: emptyToNull(setup.accountNumber),
        alertThreshold: setup.alertThreshold,
      },
      setup.openingBalance,
    )
  }

  if (params.cash) {
    addAccount(
      {
        id: newId(),
        organizationId,
        branchId,
        kind: AccountKind.CASH,
        operatorId: null,
        label: "Caisse espèces",
        alertThreshold: params.cash.alertThreshold,
      },
      params.cash.openingBalance,
    )
  }

  return { accounts, ledgerEntries }
}
