"use server"

import { revalidatePath } from "next/cache"

import { createOperationSchema } from "@/schemas/operation"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { createOperation, type CreateOperationResult } from "@/server/operations/create"

export async function createOperationAction(raw: unknown): Promise<CreateOperationResult> {
  const parsed = createOperationSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Saisie invalide" }
  }

  try {
    const result = await createOperation(await requireActor(), parsed.data)
    if (result.ok) {
      revalidatePath("/operations/new")
      revalidatePath("/dashboard")
    }
    return result
  } catch (error) {
    if (error instanceof SessionError) return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    console.error("Operation entry failed", error)
    // In development only, show the technical cause on screen to help debugging.
    const detail = process.env.NODE_ENV === "development" && error instanceof Error ? ` [${error.name}: ${error.message}]` : ""
    return { ok: false, error: `L'opération n'a pas été enregistrée. Réessayez.${detail}` }
  }
}
