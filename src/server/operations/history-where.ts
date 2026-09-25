import type { Prisma } from "@/generated/prisma/client"
import { startOfDakarDay } from "@/lib/dates"
import type { DayRange, HistoryFilters } from "@/lib/history-filters"
import { MAX_AMOUNT } from "@/schemas/onboarding"
import type { Actor } from "@/server/auth/permissions"

const DAY_MS = 24 * 60 * 60 * 1000

// Who sees what (cahier 5): the owner everything, a manager their branches, an agent their own
// operations. Filters are added ON TOP of it (AND): a filter can narrow, never widen, the view.
export function visibilityWhere(actor: Actor): Prisma.TransactionWhereInput {
  if (actor.role === "OWNER") return {}
  if (actor.role === "MANAGER") return { branchId: { in: [...actor.branchIds] } }
  return { memberId: actor.memberId }
}

// Bounds of a period in Dakar days, for any createdAt column. null = no bound ("all").
export function periodBounds(period: HistoryFilters["period"], now: Date): { gte: Date; lt?: Date } | null {
  const today = startOfDakarDay(now)
  switch (period) {
    case "today":
      return { gte: today }
    case "yesterday":
      return { gte: new Date(today.getTime() - DAY_MS), lt: today }
    case "7d":
      return { gte: new Date(today.getTime() - 6 * DAY_MS) }
    case "30d":
      return { gte: new Date(today.getTime() - 29 * DAY_MS) }
    case "all":
      return null
  }
}

export function periodWhere(period: HistoryFilters["period"], now: Date): Prisma.TransactionWhereInput {
  const bounds = periodBounds(period, now)
  return bounds ? { createdAt: bounds } : {}
}

// A chosen range of Dakar days, both included (Dakar is UTC+0 all year).
export function rangeWhere(range: DayRange): Prisma.TransactionWhereInput {
  return { createdAt: { gte: new Date(`${range.from}T00:00:00.000Z`), lte: new Date(`${range.to}T23:59:59.999Z`) } }
}

// One search field: a customer number (even partial), an operator reference, or an exact amount.
export function searchWhere(q: string): Prisma.TransactionWhereInput {
  const text = q.trim()
  if (!text) return {}

  const digits = text.replace(/[\s.\-]/g, "").replace(/^(\+221|00221)/, "")
  const byReference: Prisma.TransactionWhereInput = { reference: { contains: text, mode: "insensitive" } }
  if (!/^\d+$/.test(digits)) return byReference

  const amount = Number(digits)
  return {
    OR: [
      byReference,
      { customerPhone: { contains: digits } },
      ...(Number.isSafeInteger(amount) && amount <= MAX_AMOUNT ? [{ amount }] : []),
    ],
  }
}

// `since`: start of the history the plan shows (plans/limits historyStart), null = everything.
export function buildHistoryWhere(filters: HistoryFilters, actor: Actor, now: Date, since: Date | null = null): Prisma.TransactionWhereInput {
  const conditions: Prisma.TransactionWhereInput[] = [
    visibilityWhere(actor),
    filters.range ? rangeWhere(filters.range) : periodWhere(filters.period, now),
    searchWhere(filters.q),
  ]
  if (since) conditions.push({ createdAt: { gte: since } })
  if (filters.branch) conditions.push({ branchId: filters.branch })
  if (filters.agent && actor.role !== "AGENT") conditions.push({ memberId: filters.agent })
  if (filters.operator) conditions.push({ operatorId: filters.operator })
  if (filters.type) conditions.push({ type: filters.type })
  if (filters.status) conditions.push({ status: filters.status })

  return { AND: conditions.filter((condition) => Object.keys(condition).length > 0) }
}
