import type { Prisma } from "@/generated/prisma/client"
import {
  AccountKind,
  LedgerReason,
  Role,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/generated/prisma/enums"
import type { OnboardingInput } from "@/schemas/onboarding"

export const TRIAL_DAYS = 7

export type CatalogOperator = { id: string; name: string }

export type ProvisioningContext = {
  clerkOrgId: string
  clerkUserId: string
  memberName: string
  operators: readonly CatalogOperator[] // active operators of the global catalogue
  now: Date
  newId: () => string
}

export type ProvisioningRows = {
  organization: Prisma.OrganizationCreateManyInput
  member: Prisma.MemberCreateManyInput
  branch: Prisma.BranchCreateManyInput
  memberBranch: Prisma.MemberBranchCreateManyInput
  orgOperators: Prisma.OrgOperatorCreateManyInput[]
  accounts: Prisma.AccountCreateManyInput[]
  ledgerEntries: Prisma.LedgerEntryCreateManyInput[]
  subscription: Prisma.SubscriptionCreateManyInput
}

export class UnknownOperatorError extends Error {
  constructor(operatorId: string) {
    super(`Operator "${operatorId}" is not in the active catalogue`)
    this.name = "UnknownOperatorError"
  }
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null
}

// Pure: turns a validated onboarding form into every row to insert. No database access.
// The caller writes all of them in one transaction (see provision.ts).
export function buildProvisioningRows(
  input: OnboardingInput,
  context: ProvisioningContext,
): ProvisioningRows {
  const { newId, now } = context
  const organizationId = newId()
  const memberId = newId()
  const branchId = newId()

  const catalog = new Map(context.operators.map((operator) => [operator.id, operator]))

  const accounts: Prisma.AccountCreateManyInput[] = []
  const ledgerEntries: Prisma.LedgerEntryCreateManyInput[] = []

  // An opening balance is the first ledger line of the account. A zero balance needs no line.
  const addAccount = (account: Prisma.AccountCreateManyInput, openingBalance: number) => {
    accounts.push(account)
    if (openingBalance > 0) {
      ledgerEntries.push({
        id: newId(),
        organizationId,
        accountId: account.id as string,
        reason: LedgerReason.OPENING,
        delta: openingBalance,
        memberId,
      })
    }
  }

  const orgOperators: Prisma.OrgOperatorCreateManyInput[] = input.operators.map((setup) => {
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

    return { id: newId(), organizationId, operatorId: operator.id, isActive: true }
  })

  addAccount(
    {
      id: newId(),
      organizationId,
      branchId,
      kind: AccountKind.CASH,
      operatorId: null,
      label: "Caisse espèces",
      alertThreshold: input.cash.alertThreshold,
    },
    input.cash.openingBalance,
  )

  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  return {
    organization: {
      id: organizationId,
      clerkOrgId: context.clerkOrgId,
      name: input.organizationName,
    },
    member: {
      id: memberId,
      organizationId,
      clerkUserId: context.clerkUserId,
      name: context.memberName,
      role: Role.OWNER,
    },
    branch: {
      id: branchId,
      organizationId,
      name: input.branchName,
      address: emptyToNull(input.branchAddress),
    },
    memberBranch: { id: newId(), organizationId, memberId, branchId },
    orgOperators,
    accounts,
    ledgerEntries,
    subscription: {
      id: newId(),
      organizationId,
      plan: SubscriptionPlan.PRO, // the trial gives access to Pro features (mockup 07)
      status: SubscriptionStatus.TRIAL,
      trialEndsAt,
    },
  }
}
