import { z } from "zod"

// Forms of the SaaS admin console. Amounts in whole FCFA.
const organizationId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
const reason = z.string().trim().min(3, "Motif obligatoire (3 caractères au moins)").max(300)

export const extendTrialSchema = z.object({ organizationId, days: z.coerce.number().int().min(1).max(90), reason })

export const recordPaymentSchema = z.object({
  organizationId,
  amount: z.coerce.number().int("Montant en francs entiers").min(1, "Montant invalide").max(10_000_000),
  months: z.coerce.number().int().min(1).max(24),
  provider: z.enum(["WAVE", "ORANGE_MONEY", "MIXX", "CASH", "OTHER"]),
  providerRef: z.string().trim().max(100).optional().transform((value) => value || null),
})

export const changePlanSchema = z.object({ organizationId, plan: z.enum(["BASIC", "PRO", "BUSINESS"]), reason })

export const suspendSchema = z.object({ organizationId, reason })
export const reactivateSchema = z.object({ organizationId, reason })

export const PAYMENT_PROVIDER_LABELS = { WAVE: "Wave", ORANGE_MONEY: "Orange Money", MIXX: "Mixx by Yas", CASH: "Espèces", OTHER: "Autre" } as const
