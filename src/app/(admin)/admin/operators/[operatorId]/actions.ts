"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { getAdminDb } from "@/server/admin/db"
import { AdminAccessError } from "@/server/admin/identity"
import { saveScale } from "@/server/admin/tiers"
import type { ActionResult } from "@/server/result"

const amount = z.number().int("Montants en francs entiers").min(0).max(1_000_000_000)
const scaleSchema = z.object({
  operatorId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  mode: z.enum(["PER_TRANSACTION", "DAILY_VOLUME"]),
  tiers: z.array(z.object({ minAmount: amount, maxAmount: amount.nullable(), commission: amount })).max(50),
})

export async function saveScaleAction(raw: unknown): Promise<ActionResult> {
  const parsed = scaleSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Barème invalide." }
  let admin
  try {
    admin = await getAdminDb() // the admin check, again, on every action
  } catch (error) {
    if (error instanceof AdminAccessError) redirect("/")
    throw error
  }
  const { operatorId, mode, tiers } = parsed.data
  const result = await saveScale(admin.db, operatorId, mode, tiers)
  if (result.ok) revalidatePath(`/admin/operators/${operatorId}`)
  return result
}
