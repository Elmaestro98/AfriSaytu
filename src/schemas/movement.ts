import { z } from "zod"

import { MOVEMENT_KINDS } from "@/lib/movement-kinds"
import { MAX_AMOUNT } from "@/schemas/onboarding"

// Shared by the movement form (client) and the Server Action (server).
// Which accounts are allowed for each kind is checked by movementPostings() on the server.
export const createMovementSchema = z.object({
  idempotencyKey: z.uuid(),
  branchId: z.string().min(1),
  kind: z.enum(MOVEMENT_KINDS, "Choisissez un type de mouvement"),
  amount: z.number("Montant invalide").int("Montant invalide").min(1, "Saisissez un montant").max(MAX_AMOUNT, "Montant trop élevé"),
  fromAccountId: z.string().min(1).nullable(),
  toAccountId: z.string().min(1).nullable(),
  description: z
    .string()
    .trim()
    .max(200, "Description trop longue")
    .transform((value) => (value === "" ? null : value)),
  // Commission payout only (checked on the server with the receiving account).
  operatorId: z.string().min(1).nullable().optional(),
  payoutMonth: z.string().nullable().optional(),
})

export type CreateMovementForm = z.input<typeof createMovementSchema>
export type CreateMovementInput = z.output<typeof createMovementSchema>
