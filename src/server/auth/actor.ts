import { SessionError } from "@/server/auth/session"
import type { Actor } from "@/server/auth/permissions"
import { getTenantDb, type TenantContext } from "@/server/db"
import { claimInvitedMember } from "@/server/team/claim"

export type ActorContext = TenantContext & {
  actor: Actor
  memberName: string
}

// Who is acting: the tenant from the Clerk session plus the member's role and branches from the
// database. Every Server Action starts with this, then calls authorize() for the action itself.
export async function requireActor(): Promise<ActorContext> {
  const ctx = await getTenantDb()

  const existing = await ctx.db.member.findFirst({
    where: { clerkUserId: ctx.userId },
    select: { id: true, name: true, role: true, isActive: true, branches: { select: { branchId: true } } },
  })

  const member = existing ?? (await claimInvitedMember(ctx))
  if (!member) throw new SessionError("NOT_A_MEMBER")
  if (!member.isActive) throw new SessionError("MEMBER_DISABLED")

  return {
    ...ctx,
    memberName: member.name,
    actor: {
      memberId: member.id,
      role: member.role,
      branchIds: member.branches.map((branch) => branch.branchId),
    },
  }
}
