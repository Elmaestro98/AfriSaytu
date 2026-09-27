import { cookies } from "next/headers"

import type { ActorContext } from "@/server/auth/actor"
import { recordAudit } from "@/server/audit/log"
import { getTenantDb, type TenantContext } from "@/server/db"
import { ACTOR_COOKIE, ACTOR_COOKIE_OPTIONS, ACTOR_IDLE_MS, actorSecret, signActorClaim } from "@/server/devices/actor-cookie"
import { currentDevice } from "@/server/devices/current"
import { MAX_PIN_FAILURES, afterAttempt, isLocked, pinPepper, verifyPin } from "@/server/devices/pin"
import { DEVICE_COOKIE } from "@/server/devices/token"
import type { ActionResult } from "@/server/result"

// "Qui travaille ?" on a shared phone: choose one's name, type one's code.

type SwitchSession = { ctx: TenantContext; sessionMember: { id: string; name: string }; device: NonNullable<Awaited<ReturnType<typeof currentDevice>>> }

// The signed-in account of the phone (still an active member) and the shared phone it is.
async function switchSession(): Promise<SwitchSession | null> {
  const ctx = await getTenantDb()
  const sessionMember = await ctx.db.member.findFirst({ where: { clerkUserId: ctx.userId, isActive: true }, select: { id: true, name: true } })
  if (!sessionMember) return null
  const device = await currentDevice(ctx)
  return device ? { ctx, sessionMember, device } : null
}

function asActor(session: SwitchSession, member: { id: string; name: string }, role: "AGENT" | "SESSION"): ActorContext {
  return {
    ...session.ctx,
    memberName: member.name,
    actor: { memberId: member.id, role: role === "AGENT" ? "AGENT" : "MANAGER", branchIds: [session.device.branchId] },
    sharedDevice: { id: session.device.id, branchId: session.device.branchId },
  }
}

export type SwitchAgent = { id: string; name: string; lockedUntil: Date | null }
export type SwitchScreenData = { deviceName: string; branchName: string; agents: SwitchAgent[] }

export async function loadSwitchScreen(): Promise<SwitchScreenData | null> {
  const session = await switchSession()
  if (!session) return null
  const now = new Date()
  const agents = await session.ctx.db.member.findMany({
    where: { role: "AGENT", isActive: true, pinHash: { not: null }, branches: { some: { branchId: session.device.branchId } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, pinLockedUntil: true },
  })
  return {
    deviceName: session.device.name,
    branchName: session.device.branch.name,
    agents: agents.map((agent) => ({ id: agent.id, name: agent.name, lockedUntil: agent.pinLockedUntil && agent.pinLockedUntil > now ? agent.pinLockedUntil : null })),
  }
}

const timeFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Dakar", hour: "2-digit", minute: "2-digit" })

export async function unlock(memberId: string, pin: string, now = new Date()): Promise<ActionResult> {
  const session = await switchSession()
  if (!session) return { ok: false, error: "Ce téléphone n'est pas un téléphone partagé." }
  const pepper = pinPepper()
  const secret = actorSecret()
  if (!pepper || !secret) return { ok: false, error: "Le changement rapide d'agent n'est pas configuré sur ce serveur." }

  const agent = await session.ctx.db.member.findFirst({
    where: { id: memberId, isActive: true, role: "AGENT", branches: { some: { branchId: session.device.branchId } } },
    select: { id: true, name: true, pinHash: true, pinFailures: true, pinLockedUntil: true },
  })
  if (!agent?.pinHash) return { ok: false, error: "Profil introuvable sur ce téléphone." }

  const state = { failures: agent.pinFailures, lockedUntil: agent.pinLockedUntil }
  if (isLocked(state, now)) return { ok: false, error: `Trop de codes faux : réessayez après ${timeFormat.format(state.lockedUntil!)}.` }

  const right = verifyPin(pin, agent.pinHash, pepper)
  const next = afterAttempt(state, right, now)
  await session.ctx.db.member.update({ where: { id: agent.id }, data: { pinFailures: next.failures, pinLockedUntil: next.lockedUntil } })
  if (next.justLocked) {
    await recordAudit(asActor(session, agent, "AGENT"), { action: "member.pinLocked", entity: "Member", entityId: agent.id, branchId: session.device.branchId })
    return { ok: false, error: `Trop de codes faux : profil bloqué jusqu'à ${timeFormat.format(next.lockedUntil!)}.` }
  }
  if (!right) {
    const left = MAX_PIN_FAILURES - next.failures
    return { ok: false, error: `Code incorrect. Encore ${left} essai${left > 1 ? "s" : ""} avant blocage.` }
  }

  ;(await cookies()).set(ACTOR_COOKIE, signActorClaim({ deviceId: session.device.id, memberId: agent.id, expiresAt: now.getTime() + ACTOR_IDLE_MS }, secret), ACTOR_COOKIE_OPTIONS)
  await session.ctx.db.sharedDevice.update({ where: { id: session.device.id }, data: { lastSeenAt: now } })
  return { ok: true }
}

// "Changer d'agent" or 5 minutes without activity: nobody at the controls any more.
export async function lock(): Promise<void> {
  ;(await cookies()).delete(ACTOR_COOKIE)
}

// Stops sharing THIS phone (anyone on it may: the phone is then signed out, and only the account's
// password brings it back). Withdrawn, audited under the signed-in account.
export async function leaveSharedMode(): Promise<ActionResult> {
  const session = await switchSession()
  const jar = await cookies()
  if (session) {
    await session.ctx.db.sharedDevice.update({ where: { id: session.device.id }, data: { revokedAt: new Date() } })
    await recordAudit(asActor(session, session.sessionMember, "SESSION"), {
      action: "device.revoke", entity: "SharedDevice", entityId: session.device.id, branchId: session.device.branchId, before: { name: session.device.name },
    })
  }
  jar.delete(ACTOR_COOKIE)
  jar.delete(DEVICE_COOKIE)
  return { ok: true }
}
