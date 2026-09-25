import type { Role } from "@/generated/prisma/enums"
import { INVITABLE_ROLES } from "@/schemas/team"
import { authorize, canAssignRole, canManageMember, type Actor } from "@/server/auth/permissions"

// Pure decisions for team management. No database, no Clerk: unit-tested.

export type Plan = { ok: true } | { ok: false; error: string }

export type TeamTarget = {
  memberId: string
  role: Role
  branchIds: readonly string[]
  isActive: boolean
}

export function planInvitation(actor: Actor, role: Role, branchIds: readonly string[]): Plan {
  if (!authorize(actor, "member:manage").allowed) {
    return { ok: false, error: "Vous n'avez pas le droit d'inviter des membres." }
  }
  if (!canAssignRole(actor.role, role)) {
    return { ok: false, error: "Vous ne pouvez pas inviter ce rôle." }
  }
  for (const branchId of branchIds) {
    if (!authorize(actor, "member:manage", { branchId }).allowed) {
      return { ok: false, error: "Vous ne gérez pas l'un des points de vente choisis." }
    }
  }
  return { ok: true }
}

export function planDeactivation(actor: Actor, target: TeamTarget): Plan {
  if (target.memberId === actor.memberId) {
    return { ok: false, error: "Vous ne pouvez pas vous désactiver vous-même." }
  }
  if (!target.isActive) {
    return { ok: false, error: "Ce membre est déjà désactivé." }
  }
  if (!canManageMember(actor.role, target.role)) {
    return { ok: false, error: "Vous ne pouvez pas désactiver ce membre." }
  }
  // A manager only manages people who work in at least one of their own branches.
  if (actor.role === "MANAGER") {
    const shared = target.branchIds.some((branchId) => actor.branchIds.includes(branchId))
    if (!shared) {
      return { ok: false, error: "Ce membre ne travaille dans aucun de vos points de vente." }
    }
  }
  return { ok: true }
}

export type InvitationMetadata = { role: "MANAGER" | "AGENT"; branchIds: string[] }

// Reads the role and branches the server stored on a Clerk invitation. Anything unexpected
// returns null: no valid invitation means no access.
export function parseInvitationMetadata(value: unknown): InvitationMetadata | null {
  if (typeof value !== "object" || value === null) return null
  const { appRole, branchIds } = value as Record<string, unknown>

  const role = INVITABLE_ROLES.find((candidate) => candidate === appRole)
  if (!role) return null
  if (!Array.isArray(branchIds) || branchIds.length === 0) return null
  if (!branchIds.every((id): id is string => typeof id === "string" && id.length > 0)) return null

  return { role, branchIds: [...new Set(branchIds)] }
}
