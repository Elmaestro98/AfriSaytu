import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ActorContext } from "@/server/auth/actor"
import type { Actor } from "@/server/auth/permissions"
import { declareThisDevice, resetMemberPin, revokeDevice, setOwnPin } from "@/server/devices/manage"
import { verifyPin } from "@/server/devices/pin"
import { DEVICE_COOKIE, hashDeviceToken } from "@/server/devices/token"

const jar = new Map<string, string>()
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))

const PEPPER = "a-server-side-secret-of-at-least-32-characters"
const owner: Actor = { memberId: "m_owner", role: "OWNER", branchIds: [] }
const manager: Actor = { memberId: "m_manager", role: "MANAGER", branchIds: ["b1"] }
const agent: Actor = { memberId: "m_agent", role: "AGENT", branchIds: ["b1"] }

function context(actor: Actor, members: Record<string, { role: string; branchIds: string[] }> = {}) {
  const devices = new Map<string, { id: string; branchId: string; name: string; tokenHash: string; revokedAt: Date | null }>()
  const db = {
    member: {
      update: vi.fn(async () => ({})),
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
        const member = members[where.id]
        return member ? { id: where.id, role: member.role, pinHash: null, branches: member.branchIds.map((branchId) => ({ branchId })) } : null
      }),
    },
    branch: { findFirst: vi.fn(async ({ where }: { where: { id: string } }) => (["b1", "b2"].includes(where.id) ? { id: where.id, name: where.id === "b1" ? "Kiosque UGB" : "Médina" } : null)) },
    sharedDevice: {
      create: vi.fn(async ({ data }: { data: { branchId: string; name: string; tokenHash: string } }) => {
        const device = { id: `d${devices.size + 1}`, ...data, revokedAt: null }
        devices.set(device.id, device)
        return device
      }),
      findFirst: vi.fn(async ({ where }: { where: { id?: string; tokenHash?: string } }) =>
        [...devices.values()].find((device) => device.revokedAt === null && (where.id ? device.id === where.id : device.tokenHash === where.tokenHash)) ?? null),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { revokedAt: Date } }) => Object.assign(devices.get(where.id)!, data)),
    },
    auditLog: { create: vi.fn(async () => ({})) },
  }
  return { ctx: { db, organizationId: "org_a", clerkOrgId: "c", userId: "u", memberName: "Med", actor } as unknown as ActorContext, db, devices }
}

beforeEach(() => {
  jar.clear()
  vi.stubEnv("PIN_PEPPER", PEPPER)
  vi.stubEnv("ACTOR_COOKIE_SECRET", "another-server-side-secret-for-the-actor-cookie")
})
afterEach(() => vi.unstubAllEnvs())

describe("setOwnPin", () => {
  it("stores the agent's own code hashed, never readable", async () => {
    const { ctx, db } = context(agent)
    expect(await setOwnPin(ctx, { pin: "2749", confirm: "2749" })).toEqual({ ok: true })
    const call = db.member.update.mock.calls[0] as unknown as [{ where: { id: string }; data: { pinHash: string } }]
    expect(call[0].where).toEqual({ id: "m_agent" })
    expect(call[0].data.pinHash).not.toContain("2749")
    expect(verifyPin("2749", call[0].data.pinHash, PEPPER)).toBe(true)
  })

  it("is for agents only, needs the server secret and refuses easy codes", async () => {
    expect((await setOwnPin(context(manager).ctx, { pin: "2749", confirm: "2749" })).ok).toBe(false)
    expect((await setOwnPin(context(agent).ctx, { pin: "1234", confirm: "1234" })).ok).toBe(false)
    vi.stubEnv("PIN_PEPPER", "")
    expect((await setOwnPin(context(agent).ctx, { pin: "2749", confirm: "2749" })).ok).toBe(false)
  })
})

describe("resetMemberPin", () => {
  const members = { a_b1: { role: "AGENT", branchIds: ["b1"] }, a_b2: { role: "AGENT", branchIds: ["b2"] }, man_b1: { role: "MANAGER", branchIds: ["b1"] } }

  it("lets a manager reset an agent of their branch, and the owner any agent", async () => {
    expect(await resetMemberPin(context(manager, members).ctx, "a_b1")).toEqual({ ok: true })
    expect(await resetMemberPin(context(owner, members).ctx, "a_b2")).toEqual({ ok: true })
  })

  it("refuses another branch's agent, a manager's code, an agent, and an unknown member", async () => {
    expect((await resetMemberPin(context(manager, members).ctx, "a_b2")).ok).toBe(false)
    expect((await resetMemberPin(context(owner, members).ctx, "man_b1")).ok).toBe(false)
    expect((await resetMemberPin(context(agent, members).ctx, "a_b1")).ok).toBe(false)
    expect((await resetMemberPin(context(owner, members).ctx, "someone_of_another_org")).ok).toBe(false)
  })
})

describe("shared phones", () => {
  it("declares this phone: a random secret in the cookie, only its hash stored", async () => {
    const { ctx, devices } = context(manager)
    expect(await declareThisDevice(ctx, { branchId: "b1" })).toEqual({ ok: true })
    const token = jar.get(DEVICE_COOKIE)!
    const [device] = [...devices.values()]
    expect(device.tokenHash).toBe(hashDeviceToken(token))
    expect(device.tokenHash).not.toBe(token)
    expect(device.name).toBe("Téléphone partagé · Kiosque UGB")
  })

  it("moves a phone already shared: the previous declaration is withdrawn", async () => {
    const { ctx, devices } = context(owner)
    await declareThisDevice(ctx, { branchId: "b1" })
    await declareThisDevice(ctx, { branchId: "b2" })
    expect([...devices.values()].map((device) => [device.branchId, device.revokedAt !== null])).toEqual([["b1", true], ["b2", false]])
  })

  it("refuses an agent, another branch's manager, and a server without its secret", async () => {
    expect((await declareThisDevice(context(agent).ctx, { branchId: "b1" })).ok).toBe(false)
    expect((await declareThisDevice(context(manager).ctx, { branchId: "b2" })).ok).toBe(false)
    vi.stubEnv("ACTOR_COOKIE_SECRET", "")
    expect((await declareThisDevice(context(owner).ctx, { branchId: "b1" })).ok).toBe(false)
    expect(jar.has(DEVICE_COOKIE)).toBe(false)
  })

  it("withdraws a phone (and forgets its secret when it is this one); not another branch's", async () => {
    const { ctx, devices } = context(owner)
    await declareThisDevice(ctx, { branchId: "b2" })
    const [device] = [...devices.values()]
    // Same organization and phone, but a manager of b1 only: the phone of b2 is out of reach.
    expect(await revokeDevice({ ...ctx, actor: manager }, device.id)).toEqual({ ok: false, error: "Vous ne gérez pas ce point de vente." })
    expect(device.revokedAt).toBeNull()
    expect(await revokeDevice(ctx, device.id)).toEqual({ ok: true })
    expect(device.revokedAt).not.toBeNull()
    expect(jar.has(DEVICE_COOKIE)).toBe(false)
  })
})
