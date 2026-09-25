"use server"

import { addOperatorAccountSchema, createBranchSchema, updateAccountSchema } from "@/schemas/settings"
import { requireActor } from "@/server/auth/actor"
import { addOperatorAccount, createBranch, updateAccount } from "@/server/branches/manage"
import type { ActionResult } from "@/server/result"

import { firstIssue, runSettingsAction } from "../guard"

const PATH = "/settings/branches"

export async function createBranchAction(raw: unknown): Promise<ActionResult> {
  const parsed = createBranchSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => createBranch(await requireActor(), parsed.data))
}

export async function addOperatorAccountAction(raw: unknown): Promise<ActionResult> {
  const parsed = addOperatorAccountSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => addOperatorAccount(await requireActor(), parsed.data))
}

export async function updateAccountAction(raw: unknown): Promise<ActionResult> {
  const parsed = updateAccountSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => updateAccount(await requireActor(), parsed.data))
}
