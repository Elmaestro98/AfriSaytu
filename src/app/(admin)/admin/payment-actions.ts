"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getAdminDb } from "@/server/admin/db"
import { AdminAccessError } from "@/server/admin/identity"
import { confirmPayment, refusePayment } from "@/server/admin/payments"
import type { ActionResult } from "@/server/result"

const paymentForm = z.object({
  paymentId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  // Where to come back: an admin page only, never an address taken as is from the form.
  returnTo: z.string().regex(/^\/admin(\/[A-Za-z0-9_-]{1,64})?$/).catch("/admin"),
})
const refuseForm = paymentForm.extend({ reason: z.string().trim().min(3, "Motif obligatoire (3 caractères au moins)").max(300) })

async function admin() {
  try {
    return await getAdminDb() // the admin check, again, on every action
  } catch (error) {
    if (error instanceof AdminAccessError) redirect("/")
    throw error
  }
}

function back(returnTo: string, result: ActionResult, done: string): never {
  revalidatePath("/admin", "layout")
  redirect(result.ok ? `${returnTo}?ok=${encodeURIComponent(done)}` : `${returnTo}?error=${encodeURIComponent(result.error)}`)
}

export async function confirmPaymentAction(form: FormData) {
  const parsed = paymentForm.safeParse(Object.fromEntries(form))
  if (!parsed.success) redirect("/admin?error=" + encodeURIComponent("Paiement invalide."))
  const { db, adminUserId } = await admin()
  back(parsed.data.returnTo, await confirmPayment(db, adminUserId, parsed.data.paymentId), "Paiement confirmé : abonnement activé.")
}

export async function refusePaymentAction(form: FormData) {
  const parsed = refuseForm.safeParse(Object.fromEntries(form))
  if (!parsed.success) redirect("/admin?error=" + encodeURIComponent(parsed.error.issues[0]?.message ?? "Formulaire invalide"))
  const { db, adminUserId } = await admin()
  back(parsed.data.returnTo, await refusePayment(db, adminUserId, parsed.data.paymentId, parsed.data.reason), "Paiement refusé.")
}
