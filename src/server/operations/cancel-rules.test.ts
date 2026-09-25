import { describe, expect, it } from "vitest"

import type { Actor } from "@/server/auth/permissions"
import { planCancellation, type CancellableOperation } from "@/server/operations/cancel-rules"

const NOW = new Date("2026-09-25T10:00:00.000Z")
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000)

const owner: Actor = { memberId: "owner", role: "OWNER", branchIds: [] }
const manager: Actor = { memberId: "manager", role: "MANAGER", branchIds: ["b1"] }
const agent: Actor = { memberId: "agent", role: "AGENT", branchIds: ["b1"] }

const operation: CancellableOperation = {
  status: "VALID",
  branchId: "b1",
  memberId: "agent",
  createdAt: minutesAgo(5),
  closingId: null,
}

describe("planCancellation", () => {
  it("lets an agent cancel their own operation within 15 minutes", () => {
    expect(planCancellation(agent, operation, NOW)).toEqual({ ok: true })
    expect(planCancellation(agent, { ...operation, createdAt: minutesAgo(15) }, NOW)).toEqual({ ok: true })
  })

  it("refuses an agent after 15 minutes, with a way forward", () => {
    const result = planCancellation(agent, { ...operation, createdAt: minutesAgo(16) }, NOW)
    expect(result).toEqual({ ok: false, error: expect.stringContaining("gérant") })
  })

  it("refuses an agent cancelling a colleague's operation", () => {
    expect(planCancellation(agent, { ...operation, memberId: "other" }, NOW).ok).toBe(false)
  })

  it("lets the manager cancel on their branch at any time, not elsewhere", () => {
    expect(planCancellation(manager, { ...operation, createdAt: minutesAgo(600) }, NOW).ok).toBe(true)
    expect(planCancellation(manager, { ...operation, branchId: "b2" }, NOW).ok).toBe(false)
  })

  it("lets the owner cancel anywhere", () => {
    expect(planCancellation(owner, { ...operation, branchId: "b9", createdAt: minutesAgo(10_000) }, NOW).ok).toBe(true)
  })

  it("never cancels twice", () => {
    expect(planCancellation(owner, { ...operation, status: "CANCELLED" }, NOW)).toEqual({
      ok: false,
      error: "Cette opération est déjà annulée.",
    })
  })

  it("never touches an operation of a closed day, even for the owner", () => {
    expect(planCancellation(owner, { ...operation, closingId: "c1" }, NOW).ok).toBe(false)
  })
})
