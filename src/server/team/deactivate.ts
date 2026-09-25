import { clerkClient } from "@clerk/nextjs/server"

import type { DeactivateMemberInput } from "@/schemas/team"
import type { ActorContext } from "@/server/auth/actor"
import { recordAudit, singleBranch } from "@/server/audit/log"
import type { ActionResult } from "@/server/result"
import { planDeactivation } from "@/server/team/rules"

// Deactivates a member without deleting anything: their operations stay in the history.
// Allowed even in read only: cutting the access of someone who left must never wait for a payment.
export async function deactivateMember(
  ctx: ActorContext,
  input: DeactivateMemberInput,
): Promise<ActionResult> {
  // Scoped to the organization by the tenant client: an id from another tenant finds nothing.
  const target = await ctx.db.member.findFirst({
    where: { id: input.memberId },
    select: {
      id: true,
      clerkUserId: true,
      role: true,
      isActive: true,
      branches: { select: { branchId: true } },
    },
  })
  if (!target) return { ok: false, error: "Membre introuvable." }

  const plan = planDeactivation(ctx.actor, {
    memberId: target.id,
    role: target.role,
    branchIds: target.branches.map((branch) => branch.branchId),
    isActive: target.isActive,
  })
  if (!plan.ok) return plan

  // The database is the source of truth: once isActive is false, requireActor() refuses them.
  await ctx.db.member.update({ where: { id: target.id }, data: { isActive: false } })

  try {
    const clerk = await clerkClient()
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: ctx.clerkOrgId,
      userId: target.clerkUserId,
    })
  } catch (error) {
    // Access is already blocked by the database. Log it, do not fail the action.
    console.error("Could not remove the Clerk membership", error)
  }

  await recordAudit(ctx, {
    action: "member.deactivate",
    entity: "Member",
    entityId: target.id,
    branchId: singleBranch(target.branches.map((branch) => branch.branchId)),
    before: { isActive: true },
    after: { isActive: false },
  })

  return { ok: true }
}
