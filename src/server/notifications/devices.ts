import type { ActorContext } from "@/server/auth/actor"
import { getBaseClient } from "@/server/db/client"
import { isNotificationKind, kindsFor, type NotificationKind } from "@/server/notifications/kinds"
import { testMessage } from "@/server/notifications/messages"
import { pushConfigured, pushToMembers } from "@/server/notifications/send"
import type { PushDeviceInput } from "@/schemas/notifications"

// A member's devices and notification choices (Réglages -> Notifications).

export type NotificationResult = { ok: true; message?: string } | { ok: false; error: string }

// Registers this browser for the member. The endpoint is the browser's own secret address, so
// whoever sends it holds the device: any earlier registration of it (another member, even of
// another organization, on a shared phone) is dropped. A phone follows the last person who
// turned notifications on. This is the only unscoped write, and only by that exact endpoint.
export async function registerDevice(ctx: ActorContext, input: PushDeviceInput): Promise<NotificationResult> {
  if (!pushConfigured()) return { ok: false, error: "Les notifications ne sont pas encore configurées sur ce serveur." }
  await getBaseClient().pushSubscription.deleteMany({ where: { endpoint: input.endpoint } })
  await ctx.db.pushSubscription.create({
    data: {
      organizationId: ctx.organizationId,
      memberId: ctx.actor.memberId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent,
    },
  })
  return { ok: true, message: "Notifications activées sur cet appareil." }
}

// Only the member's own registration of that device.
export async function removeDevice(ctx: ActorContext, endpoint: string): Promise<NotificationResult> {
  await ctx.db.pushSubscription.deleteMany({ where: { endpoint, memberId: ctx.actor.memberId } })
  return { ok: true, message: "Notifications désactivées sur cet appareil." }
}

export async function setKindMuted(ctx: ActorContext, kind: string, muted: boolean): Promise<NotificationResult> {
  if (!isNotificationKind(kind) || !kindsFor(ctx.actor.role).includes(kind)) return { ok: false, error: "Notification inconnue." }
  const member = await ctx.db.member.findFirst({ where: { id: ctx.actor.memberId }, select: { mutedNotifications: true } })
  const current = new Set(member?.mutedNotifications ?? [])
  if (muted) current.add(kind)
  else current.delete(kind)
  await ctx.db.member.update({ where: { id: ctx.actor.memberId }, data: { mutedNotifications: [...current] } })
  return { ok: true }
}

export async function sendTest(ctx: ActorContext): Promise<NotificationResult> {
  const sent = await pushToMembers(ctx.db, [ctx.actor.memberId], testMessage())
  return sent > 0 ? { ok: true, message: "Notification envoyée." } : { ok: false, error: "Aucun appareil n'a reçu la notification. Réactivez-les sur ce téléphone." }
}

export async function loadNotificationSettings(ctx: ActorContext): Promise<{ kinds: { kind: NotificationKind; muted: boolean }[]; devices: number }> {
  const [member, devices] = await Promise.all([
    ctx.db.member.findFirst({ where: { id: ctx.actor.memberId }, select: { mutedNotifications: true } }),
    ctx.db.pushSubscription.count({ where: { memberId: ctx.actor.memberId } }),
  ])
  const muted = new Set(member?.mutedNotifications ?? [])
  return { kinds: kindsFor(ctx.actor.role).map((kind) => ({ kind, muted: muted.has(kind) })), devices }
}
