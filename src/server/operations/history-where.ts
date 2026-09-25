import type { Prisma } from "@/generated/prisma/client"
import { startOfDakarDay } from "@/lib/dates"
import type { HistoryFilters } from "@/lib/history-filters"
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

export function periodWhere(period: HistoryFilters["period"], now: Date): Prisma.TransactionWhereInput {
  const today = startOfDakarDay(now)
  switch (period) {
    case "today":
      return { createdAt: { gte: today } }
    case "yesterday":
      return { createdAt: { gte: new Date(today.getTime() - DAY_MS), lt: today } }
    case "7d":
      return { createdAt: { gte: new Date(today.getTime() - 6 * DAY_MS) } }
    case "30d":
      return { createdAt: { gte: new Date(today.getTime() - 29 * DAY_MS) } }
    case "all":
      return {}
  }
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

export function buildHistoryWhere(filters: HistoryFilters, actor: Actor, now: Date): Prisma.TransactionWhereInput {
  const conditions: Prisma.TransactionWhereInput[] = [
    visibilityWhere(actor),
    periodWhere(filters.period, now),
    searchWhere(filters.q),
  ]
  if (filters.branch) conditions.push({ branchId: filters.branch })
  if (filters.agent && actor.role !== "AGENT") conditions.push({ memberId: filters.agent })
  if (filters.operator) conditions.push({ operatorId: filters.operator })
  if (filters.type) conditions.push({ type: filters.type })
  if (filters.status) conditions.push({ status: filters.status })

  return { AND: conditions.filter((condition) => Object.keys(condition).length > 0) }
}
