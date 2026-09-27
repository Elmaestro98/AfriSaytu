import { describe, expect, it } from "vitest"

import { readActorClaim, signActorClaim } from "@/server/devices/actor-cookie"

const SECRET = "a-server-side-secret-for-the-actor-cookie-0123456789"
const NOW = new Date("2026-09-27T10:00:00.000Z")
const claim = { deviceId: "d1", memberId: "awa", expiresAt: NOW.getTime() + 5 * 60_000 }

describe("actor cookie", () => {
  it("names the agent at the controls of this phone until it expires", () => {
    const value = signActorClaim(claim, SECRET)
    expect(readActorClaim(value, "d1", NOW, SECRET)).toBe("awa")
    expect(readActorClaim(value, "d1", new Date(claim.expiresAt), SECRET)).toBeNull()
  })

  it("is refused on another phone", () => {
    expect(readActorClaim(signActorClaim(claim, SECRET), "d2", NOW, SECRET)).toBeNull()
  })

  it("cannot be forged or changed without the secret", () => {
    const value = signActorClaim(claim, SECRET)
    const [, signature] = value.split(".")
    const moussa = Buffer.from(JSON.stringify({ d: "d1", m: "moussa", e: claim.expiresAt })).toString("base64url")
    expect(readActorClaim(`${moussa}.${signature}`, "d1", NOW, SECRET)).toBeNull()
    const later = Buffer.from(JSON.stringify({ d: "d1", m: "awa", e: claim.expiresAt + 86_400_000 })).toString("base64url")
    expect(readActorClaim(`${later}.${signature}`, "d1", NOW, SECRET)).toBeNull()
    expect(readActorClaim(signActorClaim(claim, "another-secret-another-secret-another"), "d1", NOW, SECRET)).toBeNull()
  })

  it("ignores garbage", () => {
    for (const value of [undefined, "", "abc", "a.b.c", ".", "x".repeat(600)]) expect(readActorClaim(value, "d1", NOW, SECRET)).toBeNull()
  })
})
