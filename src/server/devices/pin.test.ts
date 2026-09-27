import { describe, expect, it } from "vitest"

import { MAX_PIN_FAILURES, afterAttempt, hashPin, isLocked, pinProblem, verifyPin } from "@/server/devices/pin"
import { hashDeviceToken, isDeviceTokenShape, newDeviceToken } from "@/server/devices/token"

const PEPPER = "a-server-side-secret-of-at-least-32-characters"
const NOW = new Date("2026-09-27T10:00:00.000Z")

describe("pinProblem", () => {
  it("accepts an ordinary 4-digit code", () => {
    expect(pinProblem("2749")).toBeNull()
    expect(pinProblem("0381")).toBeNull()
  })

  it("refuses anything but exactly 4 digits", () => {
    for (const pin of ["", "123", "12345", "12a4", " 1234", "１２３４"]) expect(pinProblem(pin)).not.toBeNull()
  })

  it("refuses the easiest codes", () => {
    for (const pin of ["0000", "7777", "1234", "6789", "9876", "3210"]) expect(pinProblem(pin)).not.toBeNull()
  })
})

describe("hashPin / verifyPin", () => {
  it("never stores the code readable, and recognizes it", () => {
    const stored = hashPin("2749", PEPPER)
    expect(stored).not.toContain("2749")
    expect(verifyPin("2749", stored, PEPPER)).toBe(true)
    expect(verifyPin("2748", stored, PEPPER)).toBe(false)
  })

  it("gives two different hashes for the same code (random salt)", () => {
    expect(hashPin("2749", PEPPER)).not.toBe(hashPin("2749", PEPPER))
  })

  it("is useless without the server-side secret", () => {
    const stored = hashPin("2749", PEPPER)
    expect(verifyPin("2749", stored, "another-secret-another-secret-another")).toBe(false)
  })

  it("refuses a damaged record instead of crashing", () => {
    expect(verifyPin("2749", "not-a-hash", PEPPER)).toBe(false)
  })
})

describe("afterAttempt", () => {
  it("locks the profile for 15 minutes at the 5th wrong code, then counts again", () => {
    let state = { failures: 0, lockedUntil: null as Date | null }
    for (let attempt = 1; attempt < MAX_PIN_FAILURES; attempt += 1) {
      const next = afterAttempt(state, false, NOW)
      expect(next.justLocked).toBe(false)
      state = next
    }
    const locked = afterAttempt(state, false, NOW)
    expect(locked).toEqual({ failures: 0, lockedUntil: new Date("2026-09-27T10:15:00.000Z"), justLocked: true })
    expect(isLocked(locked, new Date("2026-09-27T10:14:59.000Z"))).toBe(true)
    expect(isLocked(locked, new Date("2026-09-27T10:15:00.000Z"))).toBe(false)
  })

  it("clears the count after a right code", () => {
    expect(afterAttempt({ failures: 4, lockedUntil: null }, true, NOW)).toEqual({ failures: 0, lockedUntil: null, justLocked: false })
  })
})

describe("device token", () => {
  it("is random, of a fixed shape, and stored only as a hash", () => {
    const token = newDeviceToken()
    expect(isDeviceTokenShape(token)).toBe(true)
    expect(newDeviceToken()).not.toBe(token)
    expect(hashDeviceToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(isDeviceTokenShape("../etc/passwd")).toBe(false)
    expect(isDeviceTokenShape(undefined)).toBe(false)
  })
})
