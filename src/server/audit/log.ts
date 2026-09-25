import type { Prisma } from "@/generated/prisma/client"
import type { ActorContext } from "@/server/auth/actor"

export type AuditEvent = {
  action: string // e.g. "member.invite"
  entity: string // e.g. "Member"
  entityId?: string
  branchId?: string // branch concerned; without it, only the owner sees the event
  reason?: string
  before?: Prisma.InputJsonValue
  after?: Prisma.InputJsonValue
}

// The branch of an event about several branches is only known when there is exactly one.
export function singleBranch(branchIds: readonly string[]): string | undefined {
  return branchIds.length === 1 ? branchIds[0] : undefined
}

// Immutable journal of sensitive actions (CLAUDE.md section 9). Rows are never updated or deleted.
export async function recordAudit(ctx: ActorContext, event: AuditEvent): Promise<void> {
  await ctx.db.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      memberId: ctx.actor.memberId,
      action: event.action,
      entity: event.entity,
      entityId: event.entityId,
      branchId: event.branchId,
      reason: event.reason,
      before: event.before,
      after: event.after,
    },
  })
}
