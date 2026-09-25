import { describe, expect, it } from "vitest"

import type { Actor } from "@/server/auth/permissions"
import { parseInvitationMetadata, planDeactivation, planInvitation, type TeamTarget } from "@/server/team/rules"

const owner: Actor = { memberId: "m_owner", role: "OWNER", branchIds: ["b1", "b2"] }
const manager: Actor = { memberId: "m_manager", role: "MANAGER", branchIds: ["b1"] }
const agent: Actor = { memberId: "m_agent", role: "AGENT", branchIds: ["b1"] }

const agentTarget: TeamTarget = { memberId: "m_a1", role: "AGENT", branchIds: ["b1"], isActive: true }

describe("planInvitation", () => {
  it("lets the owner invite a manager or an agent on any branch", () => {
    expect(planInvitation(owner, "MANAGER", ["b1", "b2"]).ok).toBe(true)
    expect(planInvitation(owner, "AGENT", ["b2"]).ok).toBe(true)
  })

  it("lets a manager invite an agent on their own branch", () => {
    expect(planInvitation(manager, "AGENT", ["b1"]).ok).toBe(true)
  })

  it("refuses a manager inviting on a branch they do not manage", () => {
    expect(planInvitation(manager, "AGENT", ["b1", "b2"]).ok).toBe(false)
  })

  it("refuses a manager inviting another manager", () => {
    expect(planInvitation(manager, "MANAGER", ["b1"]).ok).toBe(false)
  })

  it("refuses inviting an owner", () => {
    expect(planInvitation(owner, "OWNER", ["b1"]).ok).toBe(false)
  })

  it("refuses an agent inviting anyone", () => {
    expect(planInvitation(agent, "AGENT", ["b1"]).ok).toBe(false)
  })
})

describe("planDeactivation", () => {
  it("lets the owner deactivate a manager and an agent", () => {
    expect(planDeactivation(owner, agentTarget).ok).toBe(true)
    expect(planDeactivation(owner, { ...agentTarget, role: "MANAGER" }).ok).toBe(true)
  })

  it("lets a manager deactivate an agent who works in one of their branches", () => {
    expect(planDeactivation(manager, agentTarget).ok).toBe(true)
  })

  it("refuses a manager deactivating an agent from another branch", () => {
    expect(planDeactivation(manager, { ...agentTarget, branchIds: ["b2"] }).ok).toBe(false)
  })

  it("refuses a manager deactivating a manager or an owner", () => {
    expect(planDeactivation(manager, { ...agentTarget, role: "MANAGER" }).ok).toBe(false)
    expect(planDeactivation(manager, { ...agentTarget, role: "OWNER" }).ok).toBe(false)
  })

  it("refuses deactivating an owner, even for another owner", () => {
    expect(planDeactivation(owner, { ...agentTarget, role: "OWNER" }).ok).toBe(false)
  })

  it("refuses deactivating yourself", () => {
    expect(planDeactivation(owner, { ...agentTarget, memberId: "m_owner", role: "OWNER" }).ok).toBe(false)
  })

  it("refuses deactivating someone who is already deactivated", () => {
    expect(planDeactivation(owner, { ...agentTarget, isActive: false }).ok).toBe(false)
  })

  it("refuses an agent deactivating anyone", () => {
    expect(planDeactivation(agent, agentTarget).ok).toBe(false)
  })
})

describe("parseInvitationMetadata", () => {
  it("reads a valid invitation", () => {
    expect(parseInvitationMetadata({ appRole: "AGENT", branchIds: ["b1", "b2"] })).toEqual({
      role: "AGENT",
      branchIds: ["b1", "b2"],
    })
  })

  it("removes duplicate branches", () => {
    expect(parseInvitationMetadata({ appRole: "MANAGER", branchIds: ["b1", "b1"] })?.branchIds).toEqual(["b1"])
  })

  it("never grants the owner role from metadata", () => {
    expect(parseInvitationMetadata({ appRole: "OWNER", branchIds: ["b1"] })).toBeNull()
  })

  it("returns null when there is no valid invitation", () => {
    expect(parseInvitationMetadata(undefined)).toBeNull()
    expect(parseInvitationMetadata(null)).toBeNull()
    expect(parseInvitationMetadata({})).toBeNull()
    expect(parseInvitationMetadata({ appRole: "AGENT" })).toBeNull()
    expect(parseInvitationMetadata({ appRole: "AGENT", branchIds: [] })).toBeNull()
    expect(parseInvitationMetadata({ appRole: "AGENT", branchIds: [1, 2] })).toBeNull()
    expect(parseInvitationMetadata({ appRole: "ADMIN", branchIds: ["b1"] })).toBeNull()
  })
})
