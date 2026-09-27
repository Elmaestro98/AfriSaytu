"use server"

import { declareDeviceSchema, resetPinSchema, revokeDeviceSchema } from "@/schemas/devices"
import { requireActor } from "@/server/auth/actor"
import { declareThisDevice, resetMemberPin, revokeDevice } from "@/server/devices/manage"
import type { ActionResult } from "@/server/result"

import { firstIssue, runSettingsAction } from "../guard"

const PATH = "/settings/devices"

export async function declareThisDeviceAction(raw: unknown): Promise<ActionResult> {
  const parsed = declareDeviceSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => declareThisDevice(await requireActor(), parsed.data))
}

export async function revokeDeviceAction(raw: unknown): Promise<ActionResult> {
  const parsed = revokeDeviceSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => revokeDevice(await requireActor(), parsed.data.deviceId))
}

export async function resetPinAction(raw: unknown): Promise<ActionResult> {
  const parsed = resetPinSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => resetMemberPin(await requireActor(), parsed.data.memberId))
}
