import { createHash, randomBytes } from "node:crypto"

// A shared phone is recognized by a random secret kept in an httpOnly cookie. Only its SHA-256 is
// stored: a copy of the database never lets anyone pass for the phone.

export const DEVICE_COOKIE = "afs_device"
export const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 // a year; withdrawing the phone ends it sooner

export function newDeviceToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function isDeviceTokenShape(value: string | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value)
}
