import { cookies } from "next/headers"

import type { DeclareDeviceInput, SetPinInput } from "@/schemas/devices"
import type { ActorContext } from "@/server/auth/actor"
import { authorize, canManageMember } from "@/server/auth/permissions"
import { recordAudit, singleBranch } from "@/server/audit/log"
import { hashPin, pinPepper, pinProblem } from "@/server/devices/pin"
import { currentDevice } from "@/server/devices/current"
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE, hashDeviceToken, newDeviceToken } from "@/server/devices/token"
import type { ActionResult } from "@/server/result"

// Quick agent switch, step 1: each agent's code, and the phones declared as shared.

const NOT_CONFIGURED = "Le changement rapide d'agent n'est pas encore configuré sur ce serveur."

// An agent creates or changes their own code (from their own account).
export async function setOwnPin(ctx: ActorContext, input: SetPinInput): Promise<ActionResult> {
  if (ctx.actor.role !== "AGENT") return { ok: false, error: "Le code de changement rapide est réservé aux agents." }
  const pepper = pinPepper()
  if (!pepper) return { ok: false, error: NOT_CONFIGURED }
  const problem = pinProblem(input.pin)
  if (problem) return { ok: false, error: problem }

  await ctx.db.member.update({
    where: { id: ctx.actor.memberId },
    data: { pinHash: hashPin(input.pin, pepper), pinFailures: 0, pinLockedUntil: null },
  })
  await recordAudit(ctx, { action: "member.pinSet", entity: "Member", entityId: ctx.actor.memberId, branchId: singleBranch(ctx.actor.branchIds) })
  return { ok: true }
}

// The owner, or a manager of one of the agent's branches, clears a forgotten code (and a lock).
export async function resetMemberPin(ctx: ActorContext, memberId: string): Promise<ActionResult> {
  const target = await ctx.db.member.findFirst({
    where: { id: memberId },
    select: { id: true, role: true, pinHash: true, branches: { select: { branchId: true } } },
  })
  if (!target) return { ok: false, error: "Membre introuvable." }
  const branchIds = target.branches.map((branch) => branch.branchId)
  const inReach = ctx.actor.role === "OWNER" || branchIds.some((branchId) => authorize(ctx.actor, "member:manage", { branchId }).allowed)
  if (target.role !== "AGENT" || !canManageMember(ctx.actor.role, target.role) || !inReach) {
    return { ok: false, error: "Vous ne pouvez pas réinitialiser le code de ce membre." }
  }

  await ctx.db.member.update({ where: { id: target.id }, data: { pinHash: null, pinFailures: 0, pinLockedUntil: null } })
  await recordAudit(ctx, { action: "member.pinReset", entity: "Member", entityId: target.id, branchId: singleBranch(branchIds), before: { hadPin: target.pinHash !== null } })
  return { ok: true }
}

// Owner, or a manager of that branch (the owner's choice).
function canManageDevices(ctx: ActorContext, branchId: string): boolean {
  return ctx.actor.role !== "AGENT" && authorize(ctx.actor, "member:manage", { branchId }).allowed
}

// Makes THIS phone the shared phone of a branch: a new secret in its cookie, its hash stored.
// A phone that was already shared (for any branch) is withdrawn first: one phone, one branch.
export async function declareThisDevice(ctx: ActorContext, input: DeclareDeviceInput): Promise<ActionResult> {
  if (!canManageDevices(ctx, input.branchId)) return { ok: false, error: "Vous ne gérez pas ce point de vente." }
  if (!process.env.ACTOR_COOKIE_SECRET) return { ok: false, error: NOT_CONFIGURED }
  const branch = await ctx.db.branch.findFirst({ where: { id: input.branchId, isActive: true }, select: { id: true, name: true } })
  if (!branch) return { ok: false, error: "Point de vente introuvable." }

  const previous = await currentDevice(ctx)
  if (previous) await ctx.db.sharedDevice.update({ where: { id: previous.id }, data: { revokedAt: new Date() } })

  const token = newDeviceToken()
  const device = await ctx.db.sharedDevice.create({
    data: {
      organizationId: ctx.organizationId,
      branchId: branch.id,
      name: input.name || `Téléphone partagé · ${branch.name}`,
      tokenHash: hashDeviceToken(token),
      createdById: ctx.actor.memberId,
    },
    select: { id: true, name: true },
  })
  ;(await cookies()).set(DEVICE_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DEVICE_COOKIE_MAX_AGE })

  await recordAudit(ctx, { action: "device.register", entity: "SharedDevice", entityId: device.id, branchId: branch.id, after: { name: device.name } })
  return { ok: true }
}

// Withdraws a shared phone, from any device: it stops being shared at its next request.
export async function revokeDevice(ctx: ActorContext, deviceId: string): Promise<ActionResult> {
  const device = await ctx.db.sharedDevice.findFirst({ where: { id: deviceId, revokedAt: null }, select: { id: true, branchId: true, name: true } })
  if (!device) return { ok: false, error: "Téléphone introuvable ou déjà retiré." }
  if (!canManageDevices(ctx, device.branchId)) return { ok: false, error: "Vous ne gérez pas ce point de vente." }

  await ctx.db.sharedDevice.update({ where: { id: device.id }, data: { revokedAt: new Date() } })
  const current = await currentDevice(ctx)
  if (!current) (await cookies()).delete(DEVICE_COOKIE) // it was this phone: forget its secret too

  await recordAudit(ctx, { action: "device.revoke", entity: "SharedDevice", entityId: device.id, branchId: device.branchId, before: { name: device.name } })
  return { ok: true }
}
