import type { Prisma } from "@/generated/prisma/client"
import type { ActorContext } from "@/server/auth/actor"

export type AuditEvent = {
  action: string // e.g. "member.invite"
  entity: string // e.g. "Member"
  entityId?: string
  reason?: string
  before?: Prisma.InputJsonValue
  after?: Prisma.InputJsonValue
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
      reason: event.reason,
      before: event.before,
      after: event.after,
    },
  })
}
