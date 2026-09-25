import type { ChangeRoleInput } from "@/schemas/team"
import type { ActorContext } from "@/server/auth/actor"
import { recordAudit, singleBranch } from "@/server/audit/log"
import { refuseWriteIfInactive } from "@/server/plans/current"
import type { ActionResult } from "@/server/result"
import { planRoleChange } from "@/server/team/rules"

// Switches a member between manager and agent. The role is read from the database at every
// request (requireActor), so the change applies at once. Journaled (F-64).
export async function changeMemberRole(ctx: ActorContext, input: ChangeRoleInput): Promise<ActionResult> {
  const inactive = await refuseWriteIfInactive(ctx)
  if (inactive) return inactive

  const target = await ctx.db.member.findFirst({
    where: { id: input.memberId },
    select: { id: true, role: true, isActive: true, branches: { select: { branchId: true } } },
  })
  if (!target) return { ok: false, error: "Membre introuvable." }

  const branchIds = target.branches.map((branch) => branch.branchId)
  const plan = planRoleChange(ctx.actor, { memberId: target.id, role: target.role, branchIds, isActive: target.isActive }, input.role)
  if (!plan.ok) return plan

  await ctx.db.member.update({ where: { id: target.id }, data: { role: input.role } })

  await recordAudit(ctx, {
    action: "member.changeRole",
    entity: "Member",
    entityId: target.id,
    branchId: singleBranch(branchIds),
    before: { role: target.role },
    after: { role: input.role },
  })
  return { ok: true }
}
