import type { Prisma } from "@/generated/prisma/client"
import { Role, SubscriptionPlan, SubscriptionStatus } from "@/generated/prisma/enums"
import type { OnboardingInput } from "@/schemas/onboarding"
import { buildBranchAccounts, type CatalogOperator } from "@/server/branches/accounts"

export { UnknownOperatorError, type CatalogOperator } from "@/server/branches/accounts"

// Deliberately 7 days, not the 14 of the cahier des charges (section 13): owner's decision.
export const TRIAL_DAYS = 7

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

  const { accounts, ledgerEntries } = buildBranchAccounts({
    organizationId,
    branchId,
    memberId,
    operators: input.operators,
    cash: input.cash,
    catalog: context.operators,
    newId,
  })

  const orgOperators: Prisma.OrgOperatorCreateManyInput[] = input.operators.map((setup) => ({
    id: newId(),
    organizationId,
    operatorId: setup.operatorId,
    isActive: true,
  }))

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
