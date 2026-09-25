"use server"

import { revalidatePath } from "next/cache"

import { cancelOperationSchema } from "@/schemas/operation"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { cancelOperation } from "@/server/operations/cancel"
import type { ActionResult } from "@/server/result"

export async function cancelOperationAction(raw: unknown): Promise<ActionResult> {
  const parsed = cancelOperationSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide" }

  try {
    const result = await cancelOperation(await requireActor(), parsed.data)
    if (result.ok) {
      revalidatePath("/operations")
      revalidatePath("/dashboard")
    }
    return result
  } catch (error) {
    if (error instanceof SessionError) return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    console.error("Cancellation failed", error)
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? ` [${error.name}: ${error.message}]` : ""
    return { ok: false, error: `L'annulation n'a pas été enregistrée. Réessayez.${detail}` }
  }
}
