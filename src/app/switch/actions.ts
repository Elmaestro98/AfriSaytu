"use server"

import { z } from "zod"

import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { leaveSharedMode, lock, unlock } from "@/server/devices/switch"
import type { ActionResult } from "@/server/result"

const unlockSchema = z.object({ memberId: z.string().min(1).max(64), pin: z.string().regex(/^\d{4}$/, "Tapez les 4 chiffres de votre code.") })

async function guard(work: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof SessionError) return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    console.error("Shared phone action failed", error)
    return { ok: false, error: "L'action a échoué. Réessayez." }
  }
}

export async function unlockAction(raw: unknown): Promise<ActionResult> {
  const parsed = unlockSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Code invalide." }
  return guard(() => unlock(parsed.data.memberId, parsed.data.pin))
}

export async function lockAction(): Promise<void> {
  await lock()
}

// Called while the agent works (at most once a minute): renews their 5 minutes.
export async function keepAliveAction(): Promise<void> {
  await requireActor()
}

export async function leaveSharedModeAction(): Promise<ActionResult> {
  return guard(() => leaveSharedMode())
}
