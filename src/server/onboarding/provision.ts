import type { PrismaClient } from "@/generated/prisma/client"
import type { ProvisioningRows } from "@/server/onboarding/build-rows"

// Writes every provisioning row in ONE transaction: everything is created, or nothing is.
// Uses the base (unscoped) client on purpose: the organization does not exist yet.
// Only the onboarding Server Action may call this.
export async function provisionOrganization(
  prisma: PrismaClient,
  rows: ProvisioningRows,
): Promise<void> {
  await prisma.$transaction([
    prisma.organization.create({ data: rows.organization }),
    prisma.member.create({ data: rows.member }),
    prisma.branch.create({ data: rows.branch }),
    prisma.memberBranch.create({ data: rows.memberBranch }),
    prisma.orgOperator.createMany({ data: rows.orgOperators }),
    prisma.account.createMany({ data: rows.accounts }),
    prisma.ledgerEntry.createMany({ data: rows.ledgerEntries }),
    prisma.subscription.create({ data: rows.subscription }),
  ])
}
