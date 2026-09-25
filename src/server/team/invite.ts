import { clerkClient } from "@clerk/nextjs/server"

import type { InviteMemberInput } from "@/schemas/team"
import type { ActorContext } from "@/server/auth/actor"
import { recordAudit, singleBranch } from "@/server/audit/log"
import { getCurrentPlan, refuseWriteIfInactive } from "@/server/plans/current"
import { PLAN_LABELS, canAddMember } from "@/server/plans/limits"
import type { ActionResult } from "@/server/result"
import { planInvitation } from "@/server/team/rules"

// Sends an e-mail invitation. The role and branches are stored on the Clerk invitation by the
// server, and read back at the person's first sign-in (see claim.ts).
export async function inviteMember(ctx: ActorContext, input: InviteMemberInput): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  const branchIds = [...new Set(input.branchIds)]

  const plan = planInvitation(ctx.actor, input.role, branchIds)
  if (!plan.ok) return plan

  const subscriptionPlan = await getCurrentPlan(ctx)
  const activeMembers = await ctx.db.member.count({ where: { isActive: true } })
  if (!canAddMember(subscriptionPlan, activeMembers)) {
    return {
      ok: false,
      error: `Votre formule ${PLAN_LABELS[subscriptionPlan]} a atteint son nombre maximal d'utilisateurs.`,
    }
  }

  // The ids come from the client: check they are real, active branches of this organization.
  const branches = await ctx.db.branch.findMany({
    where: { id: { in: branchIds }, isActive: true },
    select: { id: true },
  })
  if (branches.length !== branchIds.length) {
    return { ok: false, error: "Point de vente introuvable." }
  }

  try {
    const clerk = await clerkClient()
    await clerk.organizations.createOrganizationInvitation({
      organizationId: ctx.clerkOrgId,
      inviterUserId: ctx.userId,
      emailAddress: input.email,
      role: "org:member",
      publicMetadata: { appRole: input.role, branchIds },
    })
  } catch (error) {
    console.error("Invitation failed", error)
    return { ok: false, error: "L'invitation n'a pas pu être envoyée. Vérifiez l'adresse e-mail." }
  }

  await recordAudit(ctx, {
    action: "member.invite",
    entity: "Member",
    branchId: singleBranch(branchIds),
    after: { email: input.email, role: input.role, branchIds },
  })

  return { ok: true }
}
