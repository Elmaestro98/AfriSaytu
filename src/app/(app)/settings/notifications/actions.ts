"use server"

import { revalidatePath } from "next/cache"

import { muteSchema, pushDeviceSchema, removeDeviceSchema } from "@/schemas/notifications"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { registerDevice, removeDevice, sendTest, setKindMuted, type NotificationResult } from "@/server/notifications/devices"

async function run(work: () => Promise<NotificationResult>): Promise<NotificationResult> {
  try {
    const result = await work()
    if (result.ok) revalidatePath("/settings/notifications")
    return result
  } catch (error) {
    if (error instanceof SessionError) return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    console.error("Notification settings failed", error)
    return { ok: false, error: "L'opération n'a pas abouti. Réessayez." }
  }
}

export async function registerDeviceAction(raw: unknown): Promise<NotificationResult> {
  const parsed = pushDeviceSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Ce navigateur a envoyé un abonnement invalide." }
  return run(async () => registerDevice(await requireActor(), parsed.data))
}

export async function removeDeviceAction(raw: unknown): Promise<NotificationResult> {
  const parsed = removeDeviceSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Appareil inconnu." }
  return run(async () => removeDevice(await requireActor(), parsed.data.endpoint))
}

export async function setMutedAction(raw: unknown): Promise<NotificationResult> {
  const parsed = muteSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Choix invalide." }
  return run(async () => setKindMuted(await requireActor(), parsed.data.kind, parsed.data.muted))
}

export async function sendTestAction(): Promise<NotificationResult> {
  return run(async () => sendTest(await requireActor()))
}
