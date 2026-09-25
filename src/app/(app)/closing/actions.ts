"use server"

import { revalidatePath } from "next/cache"

import { reopenClosingSchema, validateClosingSchema } from "@/schemas/closing"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { reopenClosing } from "@/server/closing/reopen"
import { validateClosing } from "@/server/closing/validate"
import type { ActionResult } from "@/server/result"

async function run(work: () => Promise<ActionResult>, failure: string): Promise<ActionResult> {
  try {
    const result = await work()
    if (result.ok) {
      revalidatePath("/closing")
      revalidatePath("/dashboard")
      revalidatePath("/operations")
    }
    return result
  } catch (error) {
    if (error instanceof SessionError) return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    console.error(failure, error)
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? ` [${error.name}: ${error.message}]` : ""
    return { ok: false, error: `${failure} Réessayez.${detail}` }
  }
}

export async function validateClosingAction(raw: unknown): Promise<ActionResult> {
  const parsed = validateClosingSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide" }
  return run(async () => validateClosing(await requireActor(), parsed.data), "La clôture n'a pas été enregistrée.")
}

export async function reopenClosingAction(raw: unknown): Promise<ActionResult> {
  const parsed = reopenClosingSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide" }
  return run(async () => reopenClosing(await requireActor(), parsed.data), "La réouverture n'a pas été enregistrée.")
}
