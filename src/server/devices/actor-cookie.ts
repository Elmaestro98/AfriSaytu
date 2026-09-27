import { createHmac, timingSafeEqual } from "node:crypto"

import { SHARED_IDLE_MS } from "@/lib/shared-device"

// On a shared phone, the agent at the controls is written in an httpOnly cookie SIGNED with a
// server secret (ACTOR_COOKIE_SECRET): the phone can neither forge it nor change the agent, the
// phone or the expiry. It lasts 5 minutes and is renewed by every action (the owner's choice).

export const ACTOR_COOKIE = "afs_actor"
export const ACTOR_IDLE_MS = SHARED_IDLE_MS

export type ActorClaim = { deviceId: string; memberId: string; expiresAt: number }

export function actorSecret(): string | null {
  const secret = process.env.ACTOR_COOKIE_SECRET
  return secret && secret.length >= 32 ? secret : null
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function signActorClaim(claim: ActorClaim, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ d: claim.deviceId, m: claim.memberId, e: claim.expiresAt })).toString("base64url")
  return `${payload}.${sign(payload, secret)}`
}

// The agent of a valid claim for THIS phone, or null (missing, forged, expired, other phone).
export function readActorClaim(value: string | undefined, deviceId: string, now: Date, secret: string): string | null {
  if (!value || value.length > 512) return null
  const [payload, signature] = value.split(".")
  if (!payload || !signature) return null
  const expected = Buffer.from(sign(payload, secret))
  const given = Buffer.from(signature)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { d?: unknown; m?: unknown; e?: unknown }
    if (claim.d !== deviceId || typeof claim.m !== "string" || typeof claim.e !== "number" || claim.e <= now.getTime()) return null
    return claim.m
  } catch {
    return null
  }
}

export const ACTOR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: ACTOR_IDLE_MS / 1000,
}
