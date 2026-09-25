import { z } from "zod"

// Shared by the onboarding form (client) and the Server Action (server).
// Amounts are whole FCFA. Labels shown to the user are in French.

export const MAX_AMOUNT = 1_000_000_000

const amountSchema = z
  .number("Montant invalide")
  .int("Montant invalide")
  .min(0, "Le montant ne peut pas être négatif")
  .max(MAX_AMOUNT, "Montant trop élevé")

const optionalText = (max: number) => z.string().trim().max(max, "Texte trop long").optional()

export const operatorSetupSchema = z.object({
  operatorId: z.string().min(1),
  accountNumber: optionalText(30),
  openingBalance: amountSchema,
  alertThreshold: amountSchema,
})

export const cashSetupSchema = z.object({
  openingBalance: amountSchema,
  alertThreshold: amountSchema,
})

export const onboardingSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Saisissez le nom de votre entreprise")
    .max(80, "Nom trop long"),
  branchName: z
    .string()
    .trim()
    .min(2, "Saisissez le nom du point de vente")
    .max(80, "Nom trop long"),
  branchAddress: optionalText(160),
  operators: z
    .array(operatorSetupSchema)
    .min(1, "Choisissez au moins un opérateur")
    .refine(
      (operators) => new Set(operators.map((operator) => operator.operatorId)).size === operators.length,
      "Un opérateur ne peut être choisi qu'une fois",
    ),
  cash: cashSetupSchema,
})

export type OperatorSetupInput = z.infer<typeof operatorSetupSchema>
export type OnboardingInput = z.infer<typeof onboardingSchema>
