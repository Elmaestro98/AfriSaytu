import { describe, expect, it } from "vitest"

import { DEFAULT_AUDIT_FILTERS, auditQueryString, parseAuditFilters } from "@/lib/audit-filters"
import type { Actor } from "@/server/auth/permissions"
import { auditVisibilityWhere, buildAuditWhere } from "@/server/audit/queries"

const NOW = new Date("2026-09-25T15:00:00.000Z")

const owner: Actor = { memberId: "m_owner", role: "OWNER", branchIds: [] }
const manager: Actor = { memberId: "m_manager", role: "MANAGER", branchIds: ["b1", "b2"] }
const agent: Actor = { memberId: "m_agent", role: "AGENT", branchIds: ["b1"] }

// The organization filter is added by the tenant client (see db/tenant-scope.test.ts); these
// tests cover who reads what inside an organization.
describe("auditVisibilityWhere", () => {
  it("shows the owner the whole journal", () => {
    expect(auditVisibilityWhere(owner)).toEqual({})
  })

  it("shows a manager their branches and their own actions only", () => {
    expect(auditVisibilityWhere(manager)).toEqual({ OR: [{ branchId: { in: ["b1", "b2"] } }, { memberId: "m_manager" }] })
  })

  it("refuses an agent", () => {
    expect(auditVisibilityWhere(agent)).toBeNull()
    expect(buildAuditWhere(agent, DEFAULT_AUDIT_FILTERS, NOW)).toBeNull()
  })
})

describe("buildAuditWhere", () => {
  it("adds the filters on top of the visibility, never instead of it", () => {
    const where = buildAuditWhere(manager, { ...DEFAULT_AUDIT_FILTERS, action: "transaction.cancel", member: "m_other" }, NOW)
    expect(where).toEqual({
      AND: [
        { OR: [{ branchId: { in: ["b1", "b2"] } }, { memberId: "m_manager" }] },
        { createdAt: { gte: new Date("2026-08-27T00:00:00.000Z") } },
        { action: "transaction.cancel" },
        { memberId: "m_other" },
      ],
    })
  })

  it("has no date bound for the whole period", () => {
    expect(buildAuditWhere(owner, { ...DEFAULT_AUDIT_FILTERS, period: "all" }, NOW)).toEqual({ AND: [] })
  })
})

describe("audit filters in the address", () => {
  it("falls back to the defaults on unknown values", () => {
    expect(parseAuditFilters({ period: "decade", action: "drop.table", member: "x'; --", limit: "9999999" })).toEqual({
      ...DEFAULT_AUDIT_FILTERS,
      limit: 500,
    })
  })

  it("round-trips the filters through the address", () => {
    const filters = { period: "7d" as const, action: "closing.reopen" as const, member: "m_1", limit: 100 }
    const query = auditQueryString(filters)
    expect(parseAuditFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters)
    expect(auditQueryString(DEFAULT_AUDIT_FILTERS)).toBe("")
  })
})
