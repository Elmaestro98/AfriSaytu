// French labels for the roles, shown in the interface.
export const ROLE_LABELS = {
  OWNER: "Propriétaire",
  MANAGER: "Gérant",
  AGENT: "Agent",
} as const

export type RoleKey = keyof typeof ROLE_LABELS

export function roleLabel(role: RoleKey): string {
  return ROLE_LABELS[role]
}
