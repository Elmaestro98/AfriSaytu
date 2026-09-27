"use server"

import { setPinSchema } from "@/schemas/devices"
import { requireActor } from "@/server/auth/actor"
import { setOwnPin } from "@/server/devices/manage"
import type { ActionResult } from "@/server/result"

import { firstIssue, runSettingsAction } from "../guard"

export async function setOwnPinAction(raw: unknown): Promise<ActionResult> {
  const parsed = setPinSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction("/settings/pin", async () => setOwnPin(await requireActor(), parsed.data))
}
