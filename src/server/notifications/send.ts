import webpush from "web-push"

import { Prisma } from "@/generated/prisma/client"
import type { TenantClient } from "@/server/db/tenant"
import type { Candidate } from "@/server/notifications/kinds"
import type { PushMessage } from "@/server/notifications/messages"

// Sending push notifications (web-push, VAPID keys from the environment, never in the code).

type NotifyDb = Pick<TenantClient, "pushSubscription" | "notificationLog" | "member">

// The public key is also given to the browser; the private key only signs on the server.
export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null
}

function vapidDetails() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  // Contact of the sender for the push services: the production site by default.
  const site = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const subject = process.env.VAPID_SUBJECT || (site ? `https://${site}` : "https://afri-saytu.vercel.app")
  return { subject, publicKey, privateKey }
}

export function pushConfigured(): boolean {
  return vapidDetails() !== null
}

// Members of the organization who have at least one device, for recipients().
export async function loadCandidates(db: NotifyDb): Promise<Candidate[]> {
  const members = await db.member.findMany({
    where: { isActive: true, pushSubscriptions: { some: {} } },
    select: { id: true, role: true, mutedNotifications: true, branches: { select: { branchId: true } } },
  })
  return members.map((member) => ({ id: member.id, role: member.role, branchIds: member.branches.map((branch) => branch.branchId), muted: member.mutedNotifications }))
}

// One event, one notification: false when `key` was already sent (unique per organization).
export async function claimOnce(db: NotifyDb, organizationId: string, key: string): Promise<boolean> {
  try {
    await db.notificationLog.create({ data: { organizationId, key } })
    return true
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false
    throw error
  }
}

const GONE = new Set([404, 410]) // the browser dropped this subscription: forget the device

// Sends to every device of these members. A failure on one device never stops the others.
export async function pushToMembers(db: NotifyDb, memberIds: readonly string[], message: PushMessage): Promise<number> {
  const details = vapidDetails()
  if (!details || memberIds.length === 0) return 0
  const devices = await db.pushSubscription.findMany({
    where: { memberId: { in: [...memberIds] } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })

  let sent = 0
  await Promise.all(
    devices.map(async (device) => {
      try {
        await webpush.sendNotification(
          { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
          JSON.stringify(message),
          { vapidDetails: details, TTL: 6 * 60 * 60, urgency: "normal" },
        )
        sent += 1
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        if (status && GONE.has(status)) await db.pushSubscription.deleteMany({ where: { id: device.id } })
        else console.error("Push notification failed", status ?? error)
      }
    }),
  )
  return sent
}
