"use server"

import { revalidatePath } from "next/cache"

import { declarePaymentSchema } from "@/schemas/billing"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { declarePayment } from "@/server/billing/declare"
import type { ActionResult } from "@/server/result"

export async function declarePaymentAction(raw: unknown): Promise<ActionResult> {
  const parsed = declarePaymentSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" }
  try {
    const result = await declarePayment(await requireActor(), parsed.data)
    if (result.ok) revalidatePath("/settings/subscription")
    return result
  } catch (error) {
    if (error instanceof SessionError) return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    console.error("Payment declaration failed", error)
    return { ok: false, error: "L'envoi a échoué. Réessayez dans un instant." }
  }
}
