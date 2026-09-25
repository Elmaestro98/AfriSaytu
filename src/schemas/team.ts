import { z } from "zod"

// Roles that can be given through an invitation. The owner is the creator of the organization.
export const INVITABLE_ROLES = ["MANAGER", "AGENT"] as const

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse e-mail invalide")),
  role: z.enum(INVITABLE_ROLES, "Choisissez un rôle"),
  branchIds: z.array(z.string().min(1)).min(1, "Choisissez au moins un point de vente"),
})

export const deactivateMemberSchema = z.object({
  memberId: z.string().min(1),
})

export const changeRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(INVITABLE_ROLES, "Choisissez un rôle"),
})

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type DeactivateMemberInput = z.infer<typeof deactivateMemberSchema>
