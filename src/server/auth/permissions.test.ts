import { describe, expect, it } from "vitest"

import type { Role } from "@/generated/prisma/enums"
import {
  authorize,
  can,
  canAssignRole,
  canManageMember,
  type Action,
  type Actor,
} from "@/server/auth/permissions"

const owner: Actor = { memberId: "m_owner", role: "OWNER", branchIds: [] }
const manager: Actor = { memberId: "m_manager", role: "MANAGER", branchIds: ["b1"] }
const agent: Actor = { memberId: "m_agent", role: "AGENT", branchIds: ["b1"] }

// One line per row of the matrix in docs/matrice-permissions.png: [owner, manager, agent]
const MATRIX: [Action, boolean, boolean, boolean][] = [
  ["transaction:create", true, true, true],
  ["transaction:cancel", true, true, true],
  ["transaction:view", true, true, true],
  ["commissionRule:manage", true, true, false],
  ["catalog:manage", true, true, false],
  ["branch:create", true, false, false],
  ["member:manage", true, true, false],
  ["closing:validate", true, true, true],
  ["closing:reopen", true, true, false],
  ["data:export", true, true, true],
  ["subscription:manage", true, false, false],
  ["audit:view", true, true, false],
]

describe("permission matrix", () => {
  it.each(MATRIX)("%s: owner=%s manager=%s agent=%s", (action, ownerOk, managerOk, agentOk) => {
    expect(can("OWNER", action)).toBe(ownerOk)
    expect(can("MANAGER", action)).toBe(managerOk)
    expect(can("AGENT", action)).toBe(agentOk)
  })

  it("has no way to edit a validated transaction, for any role", () => {
    const roles: Role[] = ["OWNER", "MANAGER", "AGENT"]
    for (const role of roles) {
      expect(can(role, "transaction:edit" as Action)).toBe(false)
    }
  })
})

describe("branch scope", () => {
  it("lets a manager act only on their own branches", () => {
    expect(authorize(manager, "transaction:view", { branchId: "b1" }).allowed).toBe(true)
    expect(authorize(manager, "transaction:view", { branchId: "b2" })).toEqual({
      allowed: false,
      reason: "BRANCH",
    })
  })

  it("lets the owner act on any branch", () => {
    expect(authorize(owner, "transaction:view", { branchId: "b2" }).allowed).toBe(true)
  })

  it("lets an agent enter and close only on their own branch", () => {
    expect(authorize(agent, "transaction:create", { branchId: "b1" }).allowed).toBe(true)
    expect(authorize(agent, "transaction:create", { branchId: "b2" }).allowed).toBe(false)
    expect(authorize(agent, "closing:validate", { branchId: "b2" }).allowed).toBe(false)
  })

  it("keeps commission rules organization-wide for a manager", () => {
    expect(authorize(manager, "commissionRule:manage", { branchId: "b2" }).allowed).toBe(true)
  })
})

describe("agent sees only their own operations", () => {
  it("allows their own, refuses a colleague's", () => {
    expect(authorize(agent, "transaction:view", { authorId: "m_agent" }).allowed).toBe(true)
    expect(authorize(agent, "transaction:view", { authorId: "m_other" })).toEqual({
      allowed: false,
      reason: "NOT_AUTHOR",
    })
  })
})

describe("cancellation", () => {
  const now = new Date("2026-09-25T10:00:00.000Z")
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000)

  it("always requires a reason", () => {
    for (const actor of [owner, manager, agent]) {
      const decision = authorize(actor, "transaction:cancel", {
        branchId: "b1",
        authorId: actor.memberId,
        createdAt: minutesAgo(1),
      }, now)
      expect(decision).toMatchObject({ allowed: true, requiresReason: true })
    }
  })

  it("lets an agent cancel their own operation within 15 minutes", () => {
    const target = { authorId: "m_agent", createdAt: minutesAgo(15) }
    expect(authorize(agent, "transaction:cancel", target, now).allowed).toBe(true)
  })

  it("refuses an agent after 15 minutes", () => {
    const target = { authorId: "m_agent", createdAt: minutesAgo(16) }
    expect(authorize(agent, "transaction:cancel", target, now)).toEqual({
      allowed: false,
      reason: "WINDOW_EXPIRED",
    })
  })

  it("refuses an agent cancelling someone else's operation", () => {
    const target = { authorId: "m_other", createdAt: minutesAgo(1) }
    expect(authorize(agent, "transaction:cancel", target, now)).toEqual({
      allowed: false,
      reason: "NOT_AUTHOR",
    })
  })

  it("refuses an agent when the creation time is unknown", () => {
    expect(authorize(agent, "transaction:cancel", { authorId: "m_agent" }, now)).toEqual({
      allowed: false,
      reason: "MISSING_TARGET",
    })
  })

  it("has no time limit for the owner and the manager", () => {
    const old = { branchId: "b1", createdAt: minutesAgo(60 * 24 * 30) }
    expect(authorize(owner, "transaction:cancel", old, now).allowed).toBe(true)
    expect(authorize(manager, "transaction:cancel", old, now).allowed).toBe(true)
  })
})

describe("closing reopening", () => {
  it("requires a reason and is refused to agents", () => {
    expect(authorize(manager, "closing:reopen", { branchId: "b1" })).toMatchObject({
      allowed: true,
      requiresReason: true,
    })
    expect(authorize(agent, "closing:reopen", { branchId: "b1" })).toEqual({
      allowed: false,
      reason: "ROLE",
    })
  })
})

describe("team management", () => {
  it("lets the owner invite managers and agents, never another owner", () => {
    expect(canAssignRole("OWNER", "MANAGER")).toBe(true)
    expect(canAssignRole("OWNER", "AGENT")).toBe(true)
    expect(canAssignRole("OWNER", "OWNER")).toBe(false)
  })

  it("lets a manager invite and manage agents only", () => {
    expect(canManageMember("MANAGER", "AGENT")).toBe(true)
    expect(canManageMember("MANAGER", "MANAGER")).toBe(false)
    expect(canManageMember("MANAGER", "OWNER")).toBe(false)
  })

  it("gives an agent no team management at all", () => {
    expect(canManageMember("AGENT", "AGENT")).toBe(false)
  })

  it("never lets anyone manage an owner through this path", () => {
    for (const role of ["OWNER", "MANAGER", "AGENT"] as Role[]) {
      expect(canManageMember(role, "OWNER")).toBe(false)
    }
  })
})
