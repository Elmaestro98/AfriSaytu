import { z } from "zod"

import { TRANSACTION_TYPES } from "@/lib/operation-types"
import { MAX_BASIS_POINTS } from "@/lib/percent"
import { MAX_AMOUNT } from "@/schemas/onboarding"

const amount = z.number("Montant invalide").int("Montant invalide").min(0, "Montant invalide").max(MAX_AMOUNT, "Montant trop élevé")

const basisPoints = z
  .number("Pourcentage invalide")
  .int("Pourcentage invalide : 2 décimales au plus")
  .min(0, "Pourcentage invalide")
  .max(MAX_BASIS_POINTS, "100 % au maximum")

// Shared by the rule form (client) and the Server Actions (server).
export const ruleFieldsSchema = z
  .object({
    operatorId: z.string().min(1, "Choisissez un opérateur"),
    type: z.enum(TRANSACTION_TYPES, "Choisissez un type d'opération"),
    minAmount: amount,
    maxAmount: amount.min(1, "Saisissez le montant maximum"),
    fixedFee: amount,
    percentage: basisPoints,
    minCommission: amount.nullable(),
    cap: amount.nullable(),
    feeFixed: amount,
    feePercentage: basisPoints,
  })
  .refine((rule) => rule.minAmount <= rule.maxAmount, {
    path: ["maxAmount"],
    message: "Le maximum doit être supérieur ou égal au minimum",
  })
  .refine((rule) => rule.minCommission === null || rule.cap === null || rule.minCommission <= rule.cap, {
    path: ["cap"],
    message: "Le plafond doit être supérieur ou égal au minimum de commission",
  })

export const replaceRuleSchema = z.object({ ruleId: z.string().min(1), rule: ruleFieldsSchema })

export const closeRuleSchema = z.object({ ruleId: z.string().min(1) })

export type RuleFieldsInput = z.infer<typeof ruleFieldsSchema>
export type ReplaceRuleInput = z.infer<typeof replaceRuleSchema>
export type CloseRuleInput = z.infer<typeof closeRuleSchema>

// Keeps only the editable fields of a rule (drops ids, dates, relations).
export function toRuleFields(rule: RuleFieldsInput): RuleFieldsInput {
  return {
    operatorId: rule.operatorId,
    type: rule.type,
    minAmount: rule.minAmount,
    maxAmount: rule.maxAmount,
    fixedFee: rule.fixedFee,
    percentage: rule.percentage,
    minCommission: rule.minCommission,
    cap: rule.cap,
    feeFixed: rule.feeFixed,
    feePercentage: rule.feePercentage,
  }
}
