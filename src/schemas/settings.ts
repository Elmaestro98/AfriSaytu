import { z } from "zod"

import { MAX_AMOUNT, onboardingSchema, operatorSetupSchema } from "@/schemas/onboarding"

const amountSchema = z.number("Montant invalide").int("Montant invalide").min(0).max(MAX_AMOUNT)

// Same fields as the branch part of the onboarding, so the same form steps can be reused.
export const createBranchSchema = onboardingSchema.omit({ organizationName: true })

export const addOperatorAccountSchema = operatorSetupSchema.extend({
  branchId: z.string().min(1),
})

export const updateAccountSchema = z.object({
  accountId: z.string().min(1),
  accountNumber: z.string().trim().max(30, "Numéro trop long").optional(),
  alertThreshold: amountSchema,
})

export const setOperatorActiveSchema = z.object({
  operatorId: z.string().min(1),
  active: z.boolean(),
})

export type CreateBranchInput = z.infer<typeof createBranchSchema>
export type AddOperatorAccountInput = z.infer<typeof addOperatorAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type SetOperatorActiveInput = z.infer<typeof setOperatorActiveSchema>

export const setSendFeeSchema = z.object({
  operatorId: z.string().min(1),
  fromUv: z.boolean(),
})

export type SetSendFeeInput = z.infer<typeof setSendFeeSchema>
