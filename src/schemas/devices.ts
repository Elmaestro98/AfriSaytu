import { z } from "zod"

// Quick agent switch: codes and shared phones. The organization, the member and the phone's
// secret never come from here.

export const setPinSchema = z
  .object({
    pin: z.string().regex(/^\d{4}$/, "Le code doit faire exactement 4 chiffres."),
    confirm: z.string(),
  })
  .refine((input) => input.pin === input.confirm, { path: ["confirm"], message: "Les deux codes ne sont pas identiques." })

export const resetPinSchema = z.object({ memberId: z.string().min(1).max(64) })

export const declareDeviceSchema = z.object({
  branchId: z.string().min(1).max(64),
  name: z.string().trim().max(40, "Nom trop long (40 caractères)").optional(),
})

export const revokeDeviceSchema = z.object({ deviceId: z.string().min(1).max(64) })

export type SetPinInput = z.infer<typeof setPinSchema>
export type DeclareDeviceInput = z.infer<typeof declareDeviceSchema>
