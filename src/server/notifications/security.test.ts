import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { GET as cronGET } from "@/app/api/cron/daily/route"
import { pushDeviceSchema } from "@/schemas/notifications"
import type { ActorContext } from "@/server/auth/actor"
import { setKindMuted } from "@/server/notifications/devices"
import { notifyLowBalances } from "@/server/notifications/triggers"

vi.mock("@/server/notifications/cron", () => ({ runDailyNotifications: vi.fn(async () => ({ organizations: 0, sent: 0 })) }))
const { runDailyNotifications } = await import("@/server/notifications/cron")

const cron = (authorization?: string) =>
  cronGET(new Request("https://afri-saytu.vercel.app/api/cron/daily", { headers: authorization ? { authorization } : {} }))

describe("daily notifications job", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("refuses everyone while CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "")
    expect((await cron("Bearer ")).status).toBe(401)
    expect(runDailyNotifications).not.toHaveBeenCalled()
  })

  it("refuses a missing or wrong secret, runs with the right one", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value")
    expect((await cron()).status).toBe(401)
    expect((await cron("Bearer wrong-value!")).status).toBe(401)
    expect(runDailyNotifications).not.toHaveBeenCalled()
    expect((await cron("Bearer s3cret-value")).status).toBe(200)
    expect(runDailyNotifications).toHaveBeenCalledOnce()
  })
})

describe("device registration input", () => {
  const valid = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } }

  it("accepts a browser subscription", () => {
    expect(pushDeviceSchema.safeParse(valid).success).toBe(true)
  })

  it("refuses a non-HTTPS address and odd keys", () => {
    expect(pushDeviceSchema.safeParse({ ...valid, endpoint: "http://evil.example/push" }).success).toBe(false)
    expect(pushDeviceSchema.safeParse({ ...valid, endpoint: "javascript:alert(1)" }).success).toBe(false)
    expect(pushDeviceSchema.safeParse({ ...valid, keys: { ...valid.keys, auth: "<script>" } }).success).toBe(false)
  })
})

function context(role: "OWNER" | "AGENT", db: Record<string, unknown>) {
  return { db, organizationId: "org_a", clerkOrgId: "c", userId: "u", memberName: "Awa", actor: { memberId: "m1", role, branchIds: ["b1"] } } as unknown as ActorContext
}

describe("notification choices", () => {
  it("refuses a kind the member's role never receives", async () => {
    const db = { member: { findFirst: vi.fn(), update: vi.fn() } }
    const result = await setKindMuted(context("AGENT", db), "SUBSCRIPTION", true)
    expect(result.ok).toBe(false)
    expect(db.member.update).not.toHaveBeenCalled()
  })

  it("only ever updates the member's own row", async () => {
    const db = { member: { findFirst: vi.fn(async () => ({ mutedNotifications: [] })), update: vi.fn(async () => ({})) } }
    await setKindMuted(context("OWNER", db), "DAILY_TIER", true)
    expect(db.member.update).toHaveBeenCalledWith({ where: { id: "m1" }, data: { mutedNotifications: ["DAILY_TIER"] } })
  })
})

describe("notifications after an action", () => {
  beforeEach(() => {
    vi.stubEnv("VAPID_PUBLIC_KEY", "public")
    vi.stubEnv("VAPID_PRIVATE_KEY", "private")
  })
  afterEach(() => vi.unstubAllEnvs())

  it("never throw, even when the database fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    const db = { account: { findMany: vi.fn(async () => { throw new Error("connection lost") }) } }
    await expect(notifyLowBalances(context("AGENT", db), "b1")).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  it("do nothing at all while the keys are not configured", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "")
    const db = { account: { findMany: vi.fn() } }
    await notifyLowBalances(context("AGENT", db), "b1")
    expect(db.account.findMany).not.toHaveBeenCalled()
  })
})
