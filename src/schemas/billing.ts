import { z } from "zod"

import { isPayableMonths } from "@/server/plans/limits"

// The owner declares a Wave payment. The amount is NOT in the form: the server computes it.
export const declarePaymentSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "BUSINESS"], "Choisissez une formule"),
  months: z.coerce.number().refine(isPayableMonths, "Durée invalide"),
  providerRef: z
    .string()
    .trim()
    .min(4, "Collez la référence de la transaction Wave")
    .max(100, "Référence trop longue"),
})

export type DeclarePaymentInput = z.infer<typeof declarePaymentSchema>
