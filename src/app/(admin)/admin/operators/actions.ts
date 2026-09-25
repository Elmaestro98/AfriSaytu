"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getAdminDb } from "@/server/admin/db"
import { AdminAccessError } from "@/server/admin/identity"
import { createOperator, reactivateOperator, removeOperator, updateOperator } from "@/server/admin/operators"
import type { ActionResult } from "@/server/result"

const ID = /^[A-Za-z0-9_-]{1,64}$/

async function adminDb() {
  try {
    return (await getAdminDb()).db // the admin check, again, on every action
  } catch (error) {
    if (error instanceof AdminAccessError) redirect("/")
    throw error
  }
}

async function logoBytes(value: FormDataEntryValue | null): Promise<Uint8Array | null> {
  return value instanceof File && value.size > 0 ? new Uint8Array(await value.arrayBuffer()) : null
}

// Create (no operatorId) or update an operator. Called by the client form, which resized the logo.
export async function saveOperatorAction(form: FormData): Promise<ActionResult> {
  const db = await adminDb()
  const operatorId = form.get("operatorId")
  const fields = { name: String(form.get("name") ?? ""), color: String(form.get("color") ?? ""), logo: await logoBytes(form.get("logo")) }
  const result =
    typeof operatorId === "string" && operatorId
      ? ID.test(operatorId) ? await updateOperator(db, operatorId, fields) : { ok: false as const, error: "Opérateur introuvable." }
      : await createOperator(db, fields)
  if (result.ok) revalidatePath("/admin/operators")
  return result
}

function back(result: ActionResult, done: string): never {
  revalidatePath("/admin/operators")
  redirect(`/admin/operators?${result.ok ? "ok" : "error"}=${encodeURIComponent(result.ok ? done : result.error)}`)
}

export async function removeOperatorAction(form: FormData) {
  const operatorId = String(form.get("operatorId") ?? "")
  if (!ID.test(operatorId)) back({ ok: false, error: "Opérateur introuvable." }, "")
  const result = await removeOperator(await adminDb(), operatorId)
  back(result, result.ok && result.removal === "DELETE"
    ? "Opérateur supprimé."
    : "Opérateur déjà utilisé : il est désactivé partout (masqué à la saisie, historique conservé).")
}

export async function reactivateOperatorAction(form: FormData) {
  const operatorId = String(form.get("operatorId") ?? "")
  if (!ID.test(operatorId)) back({ ok: false, error: "Opérateur introuvable." }, "")
  back(await reactivateOperator(await adminDb(), operatorId), "Opérateur réactivé.")
}
