"use server"

import { closeRuleSchema, replaceRuleSchema, ruleFieldsSchema } from "@/schemas/commission-rule"
import { requireActor } from "@/server/auth/actor"
import { closeRule, createRule, replaceRule } from "@/server/commissions/manage"
import type { ActionResult } from "@/server/result"

import { firstIssue, runSettingsAction } from "../guard"

const PATH = "/settings/commissions"

export async function createRuleAction(raw: unknown): Promise<ActionResult> {
  const parsed = ruleFieldsSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => createRule(await requireActor(), parsed.data))
}

export async function replaceRuleAction(raw: unknown): Promise<ActionResult> {
  const parsed = replaceRuleSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => replaceRule(await requireActor(), parsed.data))
}

export async function closeRuleAction(raw: unknown): Promise<ActionResult> {
  const parsed = closeRuleSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) }
  return runSettingsAction(PATH, async () => closeRule(await requireActor(), parsed.data))
}
