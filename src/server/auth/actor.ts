import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { SessionError } from "@/server/auth/session"
import type { Actor } from "@/server/auth/permissions"
import { getTenantDb, type TenantContext } from "@/server/db"
import { ACTOR_COOKIE, ACTOR_COOKIE_OPTIONS, ACTOR_IDLE_MS, actorSecret, readActorClaim, signActorClaim } from "@/server/devices/actor-cookie"
import { currentDevice } from "@/server/devices/current"
import { claimInvitedMember } from "@/server/team/claim"

export type ActorContext = TenantContext & {
  actor: Actor
  memberName: string
  // Set on a shared phone: the agent chosen with their code acts, never the signed-in account.
  sharedDevice?: { id: string; branchId: string } | null
}

// The agent at the controls of a shared phone, or null (no valid claim, or no longer allowed).
async function sharedAgent(ctx: TenantContext, device: { id: string; branchId: string }) {
  const secret = actorSecret()
  if (!secret) return null
  const memberId = readActorClaim((await cookies()).get(ACTOR_COOKIE)?.value, device.id, new Date(), secret)
  if (!memberId) return null
  const agent = await ctx.db.member.findFirst({
    // Still an active agent of this phone's branch, with a code (a reset code ends the session).
    where: { id: memberId, isActive: true, role: "AGENT", pinHash: { not: null }, branches: { some: { branchId: device.branchId } } },
    select: { id: true, name: true },
  })
  if (!agent) return null

  // Every action renews the 5 minutes. Cookies can only be written by actions and route
  // handlers: during a page render this is skipped (the page's own actions renew it).
  try {
    const value = signActorClaim({ deviceId: device.id, memberId: agent.id, expiresAt: Date.now() + ACTOR_IDLE_MS }, secret)
    ;(await cookies()).set(ACTOR_COOKIE, value, ACTOR_COOKIE_OPTIONS)
  } catch {
    // rendering a page: read only
  }
  return agent
}

// Who is acting: the tenant from the Clerk session plus the member's role and branches from the
// database. Every Server Action starts with this, then calls authorize() for the action itself.
// On a shared phone, the signed-in account never acts: the agent chosen with their code does,
// within that phone's branch only; with no one at the controls, the phone shows "Qui travaille ?".
// Cached per request: a page and its header ask once.
export const requireActor = cache(async (): Promise<ActorContext> => {
  const ctx = await getTenantDb()

  const existing = await ctx.db.member.findFirst({
    where: { clerkUserId: ctx.userId },
    select: { id: true, name: true, role: true, isActive: true, branches: { select: { branchId: true } } },
  })

  const member = existing ?? (await claimInvitedMember(ctx))
  if (!member) throw new SessionError("NOT_A_MEMBER")
  if (!member.isActive) throw new SessionError("MEMBER_DISABLED")

  const device = await currentDevice(ctx)
  if (device) {
    const agent = await sharedAgent(ctx, device)
    if (!agent) redirect("/switch")
    return {
      ...ctx,
      memberName: agent.name,
      actor: { memberId: agent.id, role: "AGENT", branchIds: [device.branchId] },
      sharedDevice: { id: device.id, branchId: device.branchId },
    }
  }

  return {
    ...ctx,
    memberName: member.name,
    actor: {
      memberId: member.id,
      role: member.role,
      branchIds: member.branches.map((branch) => branch.branchId),
    },
    sharedDevice: null,
  }
})
