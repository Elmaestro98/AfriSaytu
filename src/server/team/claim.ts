import { clerkClient, currentUser } from "@clerk/nextjs/server"

import type { TenantContext } from "@/server/db"
import { parseInvitationMetadata } from "@/server/team/rules"

export type ClaimedMember = {
  id: string
  name: string
  role: "OWNER" | "MANAGER" | "AGENT"
  isActive: boolean
  branches: { branchId: string }[]
}

// First sign-in of an invited person: the role and branches were stored by the server on the
// Clerk invitation (public metadata cannot be edited from the browser). Turn them into a Member.
// No valid invitation => null => no access.
export async function claimInvitedMember(ctx: TenantContext): Promise<ClaimedMember | null> {
  const clerk = await clerkClient()

  const memberships = await clerk.users.getOrganizationMembershipList({ userId: ctx.userId, limit: 100 })
  const membership = memberships.data.find((item) => item.organization.id === ctx.clerkOrgId)
  if (!membership) return null

  const invitation = parseInvitationMetadata(membership.publicMetadata)
  if (!invitation) return null

  // Every branch of the invitation must still exist in this organization.
  const branches = await ctx.db.branch.findMany({
    where: { id: { in: invitation.branchIds }, isActive: true },
    select: { id: true },
  })
  if (branches.length !== invitation.branchIds.length) return null

  const user = await currentUser()
  const name = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Membre"

  try {
    return await ctx.db.member.create({
      data: {
        organizationId: ctx.organizationId,
        clerkUserId: ctx.userId,
        name,
        role: invitation.role,
        branches: {
          create: invitation.branchIds.map((branchId) => ({
            organizationId: ctx.organizationId,
            branchId,
          })),
        },
      },
      select: { id: true, name: true, role: true, isActive: true, branches: { select: { branchId: true } } },
    })
  } catch {
    // Two requests claimed at the same time: the other one won, read its result.
    return ctx.db.member.findFirst({
      where: { clerkUserId: ctx.userId },
      select: { id: true, name: true, role: true, isActive: true, branches: { select: { branchId: true } } },
    })
  }
}
