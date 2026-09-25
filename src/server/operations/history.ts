import type { HistoryFilters } from "@/lib/history-filters"
import type { ActorContext } from "@/server/auth/actor"
import { buildHistoryWhere, visibilityWhere } from "@/server/operations/history-where"
import { OPERATION_SELECT, toOperationRow, type OperationRow } from "@/server/operations/queries"

export type HistorySummary = {
  total: number // operations matching the filters (valid and cancelled)
  validCount: number
  volume: number // valid operations only
  commission: number
}

export type HistoryResult = {
  rows: OperationRow[]
  summary: HistorySummary
  hasMore: boolean
}

// Search of the history (F-50). Sums count valid operations only: a cancelled one moved nothing.
export async function searchHistory(ctx: ActorContext, filters: HistoryFilters, now = new Date()): Promise<HistoryResult> {
  const where = buildHistoryWhere(filters, ctx.actor, now)
  const validWhere = { AND: [where, { status: "VALID" as const }] }

  const [operations, total, totals] = await Promise.all([
    ctx.db.transaction.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: filters.limit + 1, // one more to know whether there is a next page
      select: OPERATION_SELECT,
    }),
    ctx.db.transaction.count({ where }),
    ctx.db.transaction.aggregate({ where: validWhere, _sum: { amount: true, commission: true }, _count: { _all: true } }),
  ])

  return {
    rows: operations.slice(0, filters.limit).map((operation) => toOperationRow(ctx, operation, now)),
    hasMore: operations.length > filters.limit,
    summary: {
      total,
      validCount: totals._count._all,
      volume: totals._sum.amount ?? 0,
      commission: totals._sum.commission ?? 0,
    },
  }
}

export type FilterOption = { id: string; name: string }

export type HistoryOptions = {
  operators: FilterOption[]
  branches: FilterOption[] // empty when there is only one: no need to filter
  agents: FilterOption[] // empty for an agent: they only see their own operations
}

// Choices offered by the filter bar, within what the user may see.
export async function loadHistoryOptions(ctx: ActorContext): Promise<HistoryOptions> {
  const branchScope = ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }

  const [operatorRows, branches, agents] = await Promise.all([
    ctx.db.transaction.findMany({
      where: visibilityWhere(ctx.actor),
      distinct: ["operatorId"],
      select: { operator: { select: { id: true, name: true } } },
    }),
    ctx.db.branch.findMany({ where: branchScope, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ctx.actor.role === "AGENT"
      ? Promise.resolve([])
      : ctx.db.member.findMany({
          where: ctx.actor.role === "OWNER" ? {} : { branches: { some: { branchId: { in: [...ctx.actor.branchIds] } } } },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
  ])

  return {
    operators: operatorRows.map((row) => row.operator).sort((a, b) => a.name.localeCompare(b.name, "fr")),
    branches: branches.length > 1 ? branches : [],
    agents: agents.length > 1 ? agents : [],
  }
}
