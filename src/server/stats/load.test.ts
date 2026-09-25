import { describe, expect, it } from "vitest"

import type { Actor } from "@/server/auth/permissions"
import { statsWhere } from "@/server/stats/load"

const RANGE = { from: new Date("2026-09-01T00:00:00.000Z"), to: new Date("2026-09-25T15:00:00.000Z") }
const PERIOD = { status: "VALID", createdAt: { gte: RANGE.from, lte: RANGE.to } }

const owner: Actor = { memberId: "m_owner", role: "OWNER", branchIds: [] }
const manager: Actor = { memberId: "m_manager", role: "MANAGER", branchIds: ["b1", "b2"] }
const agent: Actor = { memberId: "m_agent", role: "AGENT", branchIds: ["b1"] }

// The organization filter is added by the tenant client (see db/tenant-scope.test.ts); these
// tests cover who sees what inside an organization.
describe("statsWhere", () => {
  it("gives the owner every validated operation of the period", () => {
    expect(statsWhere(owner, RANGE)).toEqual({ AND: [{}, PERIOD] })
  })

  it("limits a manager to their branches", () => {
    expect(statsWhere(manager, RANGE)).toEqual({ AND: [{ branchId: { in: ["b1", "b2"] } }, PERIOD] })
  })

  it("limits an agent to their own operations, not the whole branch", () => {
    expect(statsWhere(agent, RANGE)).toEqual({ AND: [{ memberId: "m_agent" }, PERIOD] })
  })

  it("never counts cancelled operations", () => {
    for (const actor of [owner, manager, agent]) {
      const where = statsWhere(actor, RANGE) as { AND: Record<string, unknown>[] }
      expect(where.AND[1].status).toBe("VALID")
    }
  })
})
