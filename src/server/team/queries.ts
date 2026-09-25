import type { Role } from "@/generated/prisma/enums"
import type { ActorContext } from "@/server/auth/actor"
import { planDeactivation, roleChoices } from "@/server/team/rules"

export type TeamMemberRow = {
  id: string
  name: string
  role: Role
  isActive: boolean
  isSelf: boolean
  branchNames: string[]
  canDeactivate: boolean
  roleChoices: Role[] // roles this member can be switched to by the current user
}

export type BranchOption = { id: string; name: string }

// Members the current user is allowed to see. The owner sees everyone; a manager only sees the
// people who work in at least one of their own branches.
export async function listTeam(ctx: ActorContext): Promise<TeamMemberRow[]> {
  const members = await ctx.db.member.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      branches: { select: { branchId: true, branch: { select: { name: true } } } },
    },
  })

  return members
    .filter(
      (member) =>
        ctx.actor.role === "OWNER" ||
        member.id === ctx.actor.memberId ||
        member.branches.some((link) => ctx.actor.branchIds.includes(link.branchId)),
    )
    .map((member) => {
      const target = { memberId: member.id, role: member.role, branchIds: member.branches.map((link) => link.branchId), isActive: member.isActive }
      return {
        id: member.id,
        name: member.name,
        role: member.role,
        isActive: member.isActive,
        isSelf: member.id === ctx.actor.memberId,
        branchNames: member.branches.map((link) => link.branch.name),
        canDeactivate: planDeactivation(ctx.actor, target).ok,
        roleChoices: roleChoices(ctx.actor, target),
      }
    })
}

// Branches the current user can put a new member on.
export async function listAssignableBranches(ctx: ActorContext): Promise<BranchOption[]> {
  return ctx.db.branch.findMany({
    where: {
      isActive: true,
      ...(ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}
