"use server"

import { revalidatePath } from "next/cache"

import { deactivateMemberSchema, inviteMemberSchema } from "@/schemas/team"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { deactivateMember } from "@/server/team/deactivate"
import type { ActionResult } from "@/server/result"
import { inviteMember } from "@/server/team/invite"

async function guard<T extends ActionResult>(work: () => Promise<T>): Promise<ActionResult> {
  try {
    const result = await work()
    if (result.ok) revalidatePath("/settings/team")
    return result
  } catch (error) {
    if (error instanceof SessionError) {
      return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    }
    console.error("Team action failed", error)
    return { ok: false, error: "L'action a échoué. Réessayez dans un instant." }
  }
}

export async function inviteMemberAction(raw: unknown): Promise<ActionResult> {
  const parsed = inviteMemberSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" }
  }
  return guard(async () => inviteMember(await requireActor(), parsed.data))
}

export async function deactivateMemberAction(raw: unknown): Promise<ActionResult> {
  const parsed = deactivateMemberSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Membre invalide." }
  return guard(async () => deactivateMember(await requireActor(), parsed.data))
}
