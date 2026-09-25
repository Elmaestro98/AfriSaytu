import { TRANSACTION_TYPES, type TransactionTypeKey } from "@/lib/operation-types"

// History filters live in the page address (?period=7d&type=DEPOSIT…): shareable links, and the
// browser's back button works. Anything unknown in the address falls back to the default.

export const PERIODS = ["today", "yesterday", "7d", "30d", "all"] as const
export type Period = (typeof PERIODS)[number]

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Aujourd'hui",
  yesterday: "Hier",
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  all: "Toute la période",
}

export const STATUSES = ["VALID", "CANCELLED"] as const
export type StatusFilter = (typeof STATUSES)[number]

export const PAGE_SIZE = 50
export const MAX_LIMIT = 500

export type HistoryFilters = {
  q: string // customer number, reference or amount
  period: Period
  operator: string | null
  type: TransactionTypeKey | null
  status: StatusFilter | null
  branch: string | null
  agent: string | null
  limit: number
}

export const DEFAULT_FILTERS: HistoryFilters = {
  q: "",
  period: "today",
  operator: null,
  type: null,
  status: null,
  branch: null,
  agent: null,
  limit: PAGE_SIZE,
}

type Params = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | null {
  return allowed.find((item) => item === value) ?? null
}

function id(value: string | undefined): string | null {
  return value && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null
}

export function parseHistoryFilters(params: Params): HistoryFilters {
  const limit = Number(first(params.limit))
  return {
    q: (first(params.q) ?? "").trim().slice(0, 40),
    period: oneOf(first(params.period), PERIODS) ?? DEFAULT_FILTERS.period,
    operator: id(first(params.operator)),
    type: oneOf(first(params.type), TRANSACTION_TYPES),
    status: oneOf(first(params.status), STATUSES),
    branch: id(first(params.branch)),
    agent: id(first(params.agent)),
    limit: Number.isSafeInteger(limit) && limit >= PAGE_SIZE ? Math.min(limit, MAX_LIMIT) : PAGE_SIZE,
  }
}

// Only the values that differ from the default go into the address.
export function historyQueryString(filters: HistoryFilters): string {
  const params = new URLSearchParams()
  if (filters.q) params.set("q", filters.q)
  if (filters.period !== DEFAULT_FILTERS.period) params.set("period", filters.period)
  if (filters.operator) params.set("operator", filters.operator)
  if (filters.type) params.set("type", filters.type)
  if (filters.status) params.set("status", filters.status)
  if (filters.branch) params.set("branch", filters.branch)
  if (filters.agent) params.set("agent", filters.agent)
  if (filters.limit !== PAGE_SIZE) params.set("limit", String(filters.limit))
  const query = params.toString()
  return query ? `?${query}` : ""
}
