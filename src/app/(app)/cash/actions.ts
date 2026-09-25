"use server"

import { revalidatePath } from "next/cache"

import { createMovementSchema } from "@/schemas/movement"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { createMovement, type CreateMovementResult } from "@/server/cash/create-movement"

export async function createMovementAction(raw: unknown): Promise<CreateMovementResult> {
  const parsed = createMovementSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide" }

  try {
    const result = await createMovement(await requireActor(), parsed.data)
    if (result.ok) {
      revalidatePath("/cash")
      revalidatePath("/operations/new")
    }
    return result
  } catch (error) {
    if (error instanceof SessionError) return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    console.error("Movement failed", error)
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? ` [${error.name}: ${error.message}]` : ""
    return { ok: false, error: `Le mouvement n'a pas été enregistré. Réessayez.${detail}` }
  }
}
