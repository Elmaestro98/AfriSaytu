import { z } from "zod"

import { normalizePhone } from "@/lib/phone"
import { TRANSACTION_TYPES } from "@/lib/operation-types"
import { MAX_AMOUNT } from "@/schemas/onboarding"

const amount = z.number("Montant invalide").int("Montant invalide").min(0, "Montant invalide").max(MAX_AMOUNT, "Montant trop élevé")
const sign = z.union([z.literal(-1), z.literal(0), z.literal(1)])

// Shared by the entry screen (client) and the Server Action (server).
// The organization, the author and the timestamps never come from here.
export const createOperationSchema = z
  .object({
    idempotencyKey: z.uuid(),
    branchId: z.string().min(1),
    operatorId: z.string().min(1, "Choisissez un opérateur"),
    type: z.enum(TRANSACTION_TYPES, "Choisissez un type d'opération"),
    amount: amount.min(1, "Saisissez un montant"),
    fee: amount.nullable(), // null = computed by the rule
    commission: amount.nullable(), // null = computed by the rule
    feeInCash: z.boolean(),
    manual: z.object({ uv: sign, cash: sign }).nullable(),
    customerPhone: z
      .string()
      .trim()
      .refine((value) => value === "" || normalizePhone(value) !== null, "Numéro invalide : 9 chiffres")
      .transform((value) => (value === "" ? null : normalizePhone(value))),
    reference: z
      .string()
      .trim()
      .max(40, "Référence trop longue")
      .transform((value) => (value === "" ? null : value)),
    note: z
      .string()
      .trim()
      .max(200, "Note trop longue")
      .transform((value) => (value === "" ? null : value)),
    clientCreatedAt: z.iso.datetime().nullable(), // phone time, informative only
    confirmDuplicate: z.boolean(),
  })
  .refine((input) => input.type !== "OTHER" || (input.manual !== null && (input.manual.uv !== 0 || input.manual.cash !== 0)), {
    path: ["manual"],
    message: "Pour « Autre », indiquez le sens de l'UV ou de la caisse",
  })

export type CreateOperationForm = z.input<typeof createOperationSchema>
export type CreateOperationInput = z.output<typeof createOperationSchema>

export const cancelOperationSchema = z.object({
  transactionId: z.string().min(1),
  reason: z.string().trim().min(3, "Indiquez le motif de l'annulation").max(200, "Motif trop long"),
})

export type CancelOperationInput = z.infer<typeof cancelOperationSchema>
