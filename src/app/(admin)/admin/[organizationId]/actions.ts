"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ZodError } from "zod"

import { changePlanSchema, extendTrialSchema, reactivateSchema, recordPaymentSchema, suspendSchema } from "@/schemas/admin"
import { runAdminCommand, type AdminCommand } from "@/server/admin/commands"
import { getAdminDb } from "@/server/admin/db"
import { AdminAccessError } from "@/server/admin/identity"

// Plain HTML forms (no client code). The outcome comes back in the address: ?ok= or ?error=.

function pageOf(organizationId: unknown): string {
  return `/admin/${encodeURIComponent(String(organizationId ?? ""))}`
}

function invalid(form: FormData, error: ZodError): never {
  redirect(`${pageOf(form.get("organizationId"))}?error=${encodeURIComponent(error.issues[0]?.message ?? "Formulaire invalide")}`)
}

async function execute(organizationId: string, command: AdminCommand, done: string): Promise<never> {
  let admin
  try {
    admin = await getAdminDb() // the admin check, again, on every action
  } catch (error) {
    if (error instanceof AdminAccessError) redirect("/")
    throw error
  }
  const result = await runAdminCommand(admin.db, admin.adminUserId, organizationId, command)
  revalidatePath("/admin")
  const page = pageOf(organizationId)
  redirect(result.ok ? `${page}?ok=${encodeURIComponent(done)}` : `${page}?error=${encodeURIComponent(result.error)}`)
}

export async function extendTrialAction(form: FormData) {
  const parsed = extendTrialSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) invalid(form, parsed.error)
  const { organizationId, days, reason } = parsed.data
  await execute(organizationId, { kind: "extendTrial", days, reason }, "Essai prolongé.")
}

export async function recordPaymentAction(form: FormData) {
  const parsed = recordPaymentSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) invalid(form, parsed.error)
  const { organizationId, amount, months, provider, providerRef } = parsed.data
  await execute(organizationId, { kind: "payment", amount, months, provider, providerRef }, "Paiement enregistré.")
}

export async function changePlanAction(form: FormData) {
  const parsed = changePlanSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) invalid(form, parsed.error)
  const { organizationId, plan, reason } = parsed.data
  await execute(organizationId, { kind: "plan", plan, reason }, "Formule changée.")
}

export async function suspendAction(form: FormData) {
  const parsed = suspendSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) invalid(form, parsed.error)
  await execute(parsed.data.organizationId, { kind: "suspend", reason: parsed.data.reason }, "Compte suspendu.")
}

export async function reactivateAction(form: FormData) {
  const parsed = reactivateSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) invalid(form, parsed.error)
  await execute(parsed.data.organizationId, { kind: "reactivate", reason: parsed.data.reason }, "Compte réactivé.")
}
