import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEVICE_COOKIE, newDeviceToken } from "@/server/devices/token"

const jar = new Map<string, string>()
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }) }))
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_admin1" }) }))

const { AdminAccessError, requireSaasAdmin } = await import("@/server/admin/identity")

beforeEach(() => {
  jar.clear()
  vi.stubEnv("SAAS_ADMIN_USER_IDS", "user_admin1")
})
afterEach(() => vi.unstubAllEnvs())

describe("admin console on a shared phone", () => {
  it("opens for the admin on their own phone", async () => {
    await expect(requireSaasAdmin()).resolves.toEqual({ userId: "user_admin1" })
  })

  it("is refused on a shared phone, even when its signed-in account is an admin", async () => {
    jar.set(DEVICE_COOKIE, newDeviceToken())
    await expect(requireSaasAdmin()).rejects.toBeInstanceOf(AdminAccessError)
  })
})
