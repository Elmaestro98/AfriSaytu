"use server"

import { setOperatorActiveSchema, setSendFeeSchema } from "@/schemas/settings"
import { requireActor } from "@/server/auth/actor"
import { setOperatorActive, setSendFeeFromUv } from "@/server/operators/manage"
import type { ActionResult } from "@/server/result"

import { firstIssue, runSettingsAction } from "../guard"

export async function setOperatorActiveAction(raw: unknown): Promise<ActionResult> {
  const parsed = setOperatorActiveSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction("/settings/operators", async () => setOperatorActive(await requireActor(), parsed.data))
}

export async function setSendFeeAction(raw: unknown): Promise<ActionResult> {
  const parsed = setSendFeeSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction("/settings/operators", async () => setSendFeeFromUv(await requireActor(), parsed.data))
}
