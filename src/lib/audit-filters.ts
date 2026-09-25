import { PAGE_SIZE, MAX_LIMIT, PERIODS, type Period } from "@/lib/history-filters"
import { isAuditAction, type AuditActionKey } from "@/lib/audit-actions"

// Journal filters live in the page address (?period=7d&action=transaction.cancel…), like the
// history. Anything unknown falls back to the default.

export type AuditFilters = {
  period: Period
  action: AuditActionKey | null
  member: string | null
  limit: number
}

export const DEFAULT_AUDIT_FILTERS: AuditFilters = { period: "30d", action: null, member: null, limit: PAGE_SIZE }

type Params = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export function parseAuditFilters(params: Params): AuditFilters {
  const period = first(params.period)
  const action = first(params.action)
  const member = first(params.member)
  const limit = Number(first(params.limit))
  return {
    period: PERIODS.find((item) => item === period) ?? DEFAULT_AUDIT_FILTERS.period,
    action: action && isAuditAction(action) ? action : null,
    member: member && /^[A-Za-z0-9_-]{1,64}$/.test(member) ? member : null,
    limit: Number.isSafeInteger(limit) && limit >= PAGE_SIZE ? Math.min(limit, MAX_LIMIT) : PAGE_SIZE,
  }
}

// Only the values that differ from the default go into the address.
export function auditQueryString(filters: AuditFilters): string {
  const params = new URLSearchParams()
  if (filters.period !== DEFAULT_AUDIT_FILTERS.period) params.set("period", filters.period)
  if (filters.action) params.set("action", filters.action)
  if (filters.member) params.set("member", filters.member)
  if (filters.limit !== PAGE_SIZE) params.set("limit", String(filters.limit))
  const query = params.toString()
  return query ? `?${query}` : ""
}
