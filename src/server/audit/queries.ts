import type { Prisma } from "@/generated/prisma/client"
import type { AuditFilters } from "@/lib/audit-filters"
import type { ActorContext } from "@/server/auth/actor"
import { authorize, type Actor } from "@/server/auth/permissions"
import { describeAudit } from "@/server/audit/labels"
import { periodBounds } from "@/server/operations/history-where"

// Who reads the journal (F-64, cahier 5): the owner everything; a manager the events of their
// branches and their own actions (a rule change has no branch); an agent nothing. null = denied.
export function auditVisibilityWhere(actor: Actor): Prisma.AuditLogWhereInput | null {
  if (!authorize(actor, "audit:view").allowed) return null
  if (actor.role === "OWNER") return {}
  return { OR: [{ branchId: { in: [...actor.branchIds] } }, { memberId: actor.memberId }] }
}

export function buildAuditWhere(actor: Actor, filters: AuditFilters, now: Date): Prisma.AuditLogWhereInput | null {
  const visibility = auditVisibilityWhere(actor)
  if (!visibility) return null
  const conditions: Prisma.AuditLogWhereInput[] = [visibility]
  const period = periodBounds(filters.period, now)
  if (period) conditions.push({ createdAt: period })
  if (filters.action) conditions.push({ action: filters.action })
  if (filters.member) conditions.push({ memberId: filters.member })
  return { AND: conditions.filter((condition) => Object.keys(condition).length > 0) }
}

export type AuditRow = {
  id: string
  createdAt: Date
  action: string
  title: string
  detail: string | null
  reason: string | null
  authorName: string
  branchName: string | null
}

export type AuditCounts = { total: number; cancellations: number; reopenings: number; support: number }

export type AuditPage = { rows: AuditRow[]; hasMore: boolean; members: { id: string; name: string }[]; counts: AuditCounts }

export class AuditAccessError extends Error {}

// Latest events first, one more row than the page to know whether there is a next one.
export async function listAudit(ctx: ActorContext, filters: AuditFilters, now = new Date()): Promise<AuditPage> {
  const where = buildAuditWhere(ctx.actor, filters, now)
  if (!where) throw new AuditAccessError()

  const [entries, authors, byAction, support] = await Promise.all([
    ctx.db.auditLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filters.limit + 1,
      select: {
        id: true,
        createdAt: true,
        action: true,
        reason: true,
        before: true,
        after: true,
        member: { select: { name: true } },
        branch: { select: { name: true } },
      },
    }),
    // Authors that appear in the visible journal, for the filter.
    ctx.db.auditLog.findMany({
      where: auditVisibilityWhere(ctx.actor) ?? undefined,
      distinct: ["memberId"],
      select: { member: { select: { id: true, name: true } } },
    }),
    // Summary of the filtered journal.
    ctx.db.auditLog.groupBy({ by: ["action"], where, _count: { _all: true } }),
    ctx.db.auditLog.count({ where: { AND: [where, { memberId: null }] } }), // no member: the SaaS admin
  ])
  const countOf = (action: string) => byAction.find((row) => row.action === action)?._count._all ?? 0

  return {
    hasMore: entries.length > filters.limit,
    rows: entries.slice(0, filters.limit).map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      action: entry.action,
      ...describeAudit(entry),
      reason: entry.reason,
      authorName: entry.member?.name ?? "Support AfriSaytu", // no member: the SaaS admin
      branchName: entry.branch?.name ?? null,
    })),
    counts: {
      total: byAction.reduce((sum, row) => sum + row._count._all, 0),
      cancellations: countOf("transaction.cancel"),
      reopenings: countOf("closing.reopen"),
      support,
    },
    members: authors
      .flatMap((row) => (row.member ? [row.member] : []))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
  }
}
