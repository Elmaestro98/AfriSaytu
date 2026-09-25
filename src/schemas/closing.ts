import { z } from "zod"

import { MAX_PIECES } from "@/lib/cash-count"
import { MAX_AMOUNT } from "@/schemas/onboarding"

// Shared by the closing screen (client) and the Server Actions (server).
export const validateClosingSchema = z.object({
  branchId: z.string().min(1),
  // Last closing the screen was built on: refuses to close twice if someone closed meanwhile.
  previousClosingId: z.string().min(1).nullable(),
  lines: z
    .array(
      z.object({
        accountId: z.string().min(1),
        counted: z.number("Montant invalide").int("Montant invalide").min(0, "Montant invalide").max(MAX_AMOUNT, "Montant trop élevé"),
        justification: z.string().trim().max(500, "Justification trop longue").nullable(),
      }),
    )
    .min(1),
  cashCount: z.record(z.string(), z.number().int().min(0).max(MAX_PIECES)),
})

export const reopenClosingSchema = z.object({
  closingId: z.string().min(1),
  reason: z.string().trim().min(3, "Indiquez le motif de la réouverture").max(300, "Motif trop long"),
})

export type ValidateClosingInput = z.infer<typeof validateClosingSchema>
export type ReopenClosingInput = z.infer<typeof reopenClosingSchema>
