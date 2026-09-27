import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

// Codes of the quick agent switch (4 digits). A 4-digit code is guessable, so it is protected
// three ways: easy codes are refused, it is stored hashed with a secret kept outside the database
// (PIN_PEPPER), and 5 wrong codes lock the profile for 15 minutes.

export const PIN_LENGTH = 4
export const MAX_PIN_FAILURES = 5
export const PIN_LOCK_MINUTES = 15

// Why a code is refused, or null when it is acceptable (pure).
export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "Le code doit faire exactement 4 chiffres."
  const digits = [...pin].map(Number)
  if (digits.every((digit) => digit === digits[0])) return "Code trop facile : évitez 4 chiffres identiques."
  const steps = digits.slice(1).map((digit, index) => digit - digits[index])
  if (steps.every((step) => step === 1) || steps.every((step) => step === -1)) return "Code trop facile : évitez les suites (1234, 9876…)."
  return null
}

// The server-side secret mixed into every code; null while it is not configured.
export function pinPepper(): string | null {
  const pepper = process.env.PIN_PEPPER
  return pepper && pepper.length >= 32 ? pepper : null
}

// "scrypt$<salt>$<hash>": a random salt per member, so two equal codes never look alike.
export function hashPin(pin: string, pepper: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(`${pepper}:${pin}`, salt, 32)
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`
}

export function verifyPin(pin: string, stored: string, pepper: string): boolean {
  const [scheme, salt, hash] = stored.split("$")
  if (scheme !== "scrypt" || !salt || !hash) return false
  const expected = Buffer.from(hash, "base64url")
  const given = scryptSync(`${pepper}:${pin}`, Buffer.from(salt, "base64url"), expected.length)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export type PinState = { failures: number; lockedUntil: Date | null }

export function isLocked(state: PinState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil > now
}

// The state after a code was tried (pure). A right code clears the failures; the 5th wrong one
// locks the profile for 15 minutes and starts the count again.
export function afterAttempt(state: PinState, right: boolean, now: Date): PinState & { justLocked: boolean } {
  if (right) return { failures: 0, lockedUntil: null, justLocked: false }
  const failures = state.failures + 1
  if (failures >= MAX_PIN_FAILURES) {
    return { failures: 0, lockedUntil: new Date(now.getTime() + PIN_LOCK_MINUTES * 60_000), justLocked: true }
  }
  return { failures, lockedUntil: null, justLocked: false }
}
