import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ACTOR_COOKIE, readActorClaim, signActorClaim } from "@/server/devices/actor-cookie"
import { hashPin } from "@/server/devices/pin"
import { DEVICE_COOKIE, hashDeviceToken, newDeviceToken } from "@/server/devices/token"

const jar = new Map<string, string>()
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}))
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`)
  },
}))
vi.mock("@/server/team/claim", () => ({ claimInvitedMember: async () => null }))

const PEPPER = "a-server-side-secret-of-at-least-32-characters"
const SECRET = "another-server-side-secret-for-the-actor-cookie"
const TOKEN = newDeviceToken()

type Member = { id: string; name: string; role: "OWNER" | "MANAGER" | "AGENT"; clerkUserId: string | null; isActive: boolean; branchIds: string[]; pinHash: string | null; pinFailures: number; pinLockedUntil: Date | null }
let members: Member[]
let devices: { id: string; branchId: string; name: string; tokenHash: string; revokedAt: Date | null; branch: { name: string }; lastSeenAt?: Date }[]
const audits: unknown[] = []

// A tiny stand-in for the tenant client: only the filters these modules use.
const db = {
  member: {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      const found = members.find((member) =>
        (where.clerkUserId === undefined || member.clerkUserId === where.clerkUserId) &&
        (where.id === undefined || member.id === where.id) &&
        (where.isActive === undefined || member.isActive === where.isActive) &&
        (where.role === undefined || member.role === where.role) &&
        (where.pinHash === undefined || member.pinHash !== null) &&
        (where.branches === undefined || member.branchIds.includes((where.branches as { some: { branchId: string } }).some.branchId)))
      return found ? { ...found, branches: found.branchIds.map((branchId) => ({ branchId })) } : null
    },
    findMany: async () => [],
    update: async ({ where, data }: { where: { id: string }; data: Partial<Member> }) => Object.assign(members.find((member) => member.id === where.id)!, data),
  },
  sharedDevice: {
    findFirst: async ({ where }: { where: { tokenHash: string } }) => devices.find((device) => device.tokenHash === where.tokenHash && device.revokedAt === null) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: object }) => Object.assign(devices.find((device) => device.id === where.id)!, data),
  },
  auditLog: { create: async ({ data }: { data: unknown }) => void audits.push(data) },
}
vi.mock("@/server/db", () => ({ getTenantDb: async () => ({ db, organizationId: "org_a", clerkOrgId: "c", userId: "clerk_manager" }) }))

const { unlock } = await import("@/server/devices/switch")
const { requireActor } = await import("@/server/auth/actor")
const NOW = new Date("2026-09-27T10:00:00.000Z")

beforeEach(() => {
  vi.stubEnv("PIN_PEPPER", PEPPER)
  vi.stubEnv("ACTOR_COOKIE_SECRET", SECRET)
  jar.clear()
  audits.length = 0
  jar.set(DEVICE_COOKIE, TOKEN)
  members = [
    { id: "manager", name: "Med", role: "MANAGER", clerkUserId: "clerk_manager", isActive: true, branchIds: ["b1"], pinHash: null, pinFailures: 0, pinLockedUntil: null },
    { id: "awa", name: "Awa", role: "AGENT", clerkUserId: "clerk_awa", isActive: true, branchIds: ["b1"], pinHash: hashPin("2749", PEPPER), pinFailures: 0, pinLockedUntil: null },
    { id: "fatou", name: "Fatou", role: "AGENT", clerkUserId: "clerk_fatou", isActive: true, branchIds: ["b2"], pinHash: hashPin("5081", PEPPER), pinFailures: 0, pinLockedUntil: null },
  ]
  devices = [{ id: "d1", branchId: "b1", name: "Comptoir", tokenHash: hashDeviceToken(TOKEN), revokedAt: null, branch: { name: "UGB" } }]
})
afterEach(() => vi.unstubAllEnvs())

describe("unlock", () => {
  it("gives the controls to the agent with the right code", async () => {
    expect(await unlock("awa", "2749", NOW)).toEqual({ ok: true })
    expect(readActorClaim(jar.get(ACTOR_COOKIE), "d1", NOW, SECRET)).toBe("awa")
    expect(devices[0].lastSeenAt).toEqual(NOW)
  })

  it("counts wrong codes and locks the profile at the 5th, audited", async () => {
    const first = await unlock("awa", "1111", NOW)
    expect(first).toEqual({ ok: false, error: "Code incorrect. Encore 4 essais avant blocage." })
    for (let attempt = 2; attempt <= 4; attempt += 1) await unlock("awa", "1111", NOW)
    const locked = await unlock("awa", "1111", NOW)
    expect(locked.ok).toBe(false)
    expect(members[1].pinLockedUntil).toEqual(new Date("2026-09-27T10:15:00.000Z"))
    expect(audits).toEqual([expect.objectContaining({ action: "member.pinLocked", entityId: "awa", memberId: "awa" })])
    // Locked: even the right code waits.
    expect((await unlock("awa", "2749", new Date("2026-09-27T10:05:00.000Z"))).ok).toBe(false)
    expect(jar.has(ACTOR_COOKIE)).toBe(false)
  })

  it("never opens an agent of another branch, nor a manager", async () => {
    expect((await unlock("fatou", "5081", NOW)).ok).toBe(false)
    expect((await unlock("manager", "0000", NOW)).ok).toBe(false)
    expect(jar.has(ACTOR_COOKIE)).toBe(false)
  })

  it("does nothing on a phone that is not (or no longer) shared", async () => {
    devices[0].revokedAt = NOW
    expect((await unlock("awa", "2749", NOW)).ok).toBe(false)
  })
})

describe("requireActor on a shared phone", () => {
  it("acts as the agent at the controls, within the phone's branch only", async () => {
    jar.set(ACTOR_COOKIE, signActorClaim({ deviceId: "d1", memberId: "awa", expiresAt: Date.now() + 60_000 }, SECRET))
    const ctx = await requireActor()
    expect(ctx.actor).toEqual({ memberId: "awa", role: "AGENT", branchIds: ["b1"] })
    expect(ctx.memberName).toBe("Awa")
  })

  it("sends to \"Qui travaille ?\" with nobody, an expired, forged or other-phone claim", async () => {
    await expect(requireActor()).rejects.toThrow("REDIRECT:/switch")
    jar.set(ACTOR_COOKIE, signActorClaim({ deviceId: "d1", memberId: "awa", expiresAt: Date.now() - 1 }, SECRET))
    await expect(requireActor()).rejects.toThrow("REDIRECT:/switch")
    jar.set(ACTOR_COOKIE, signActorClaim({ deviceId: "d1", memberId: "manager", expiresAt: Date.now() + 60_000 }, "forged-with-another-secret-forged-with-another"))
    await expect(requireActor()).rejects.toThrow("REDIRECT:/switch")
    jar.set(ACTOR_COOKIE, signActorClaim({ deviceId: "d2", memberId: "awa", expiresAt: Date.now() + 60_000 }, SECRET))
    await expect(requireActor()).rejects.toThrow("REDIRECT:/switch")
  })

  it("ends the session of an agent whose code was reset or who left", async () => {
    jar.set(ACTOR_COOKIE, signActorClaim({ deviceId: "d1", memberId: "awa", expiresAt: Date.now() + 60_000 }, SECRET))
    members[1].pinHash = null
    await expect(requireActor()).rejects.toThrow("REDIRECT:/switch")
  })

  it("is the signed-in member everywhere else", async () => {
    jar.delete(DEVICE_COOKIE)
    expect((await requireActor()).actor).toEqual({ memberId: "manager", role: "MANAGER", branchIds: ["b1"] })
  })
})
