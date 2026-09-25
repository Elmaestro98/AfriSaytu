import type { Role } from "@/generated/prisma/enums"

// Permission matrix of the cahier des charges (section 5, docs/matrice-permissions.png).
// Pure and database-free. Every Server Action and Route Handler must call authorize()
// before doing the work: hiding a button in the UI is not access control.
//
// "Modifier une opération validée" is allowed to nobody, so it has no action here.

export type Action =
  | "transaction:create"
  | "transaction:cancel"
  | "transaction:view"
  | "commissionRule:manage"
  | "catalog:manage" // operators and existing branches
  | "branch:create"
  | "member:manage" // invite / deactivate
  | "closing:validate"
  | "closing:reopen"
  | "data:export"
  | "subscription:manage"
  | "audit:view"

// ALL: the whole organization. BRANCHES: only the member's own branches. OWN: only what the
// member entered themselves.
export type Scope = "ALL" | "BRANCHES" | "OWN"

export type Grant = {
  scope: Scope
  requiresReason?: boolean
  windowMinutes?: number // the action is only possible this long after the record was created
}

const ALL: Grant = { scope: "ALL" }
const BRANCHES: Grant = { scope: "BRANCHES" }

type Matrix = Record<Action, Partial<Record<Role, Grant>>>

export const PERMISSIONS: Matrix = {
  "transaction:create": { OWNER: ALL, MANAGER: BRANCHES, AGENT: BRANCHES },
  "transaction:cancel": {
    OWNER: { scope: "ALL", requiresReason: true },
    MANAGER: { scope: "BRANCHES", requiresReason: true },
    AGENT: { scope: "OWN", requiresReason: true, windowMinutes: 15 },
  },
  "transaction:view": { OWNER: ALL, MANAGER: BRANCHES, AGENT: { scope: "OWN" } },
  "commissionRule:manage": { OWNER: ALL, MANAGER: ALL },
  "catalog:manage": { OWNER: ALL, MANAGER: BRANCHES },
  "branch:create": { OWNER: ALL },
  "member:manage": { OWNER: ALL, MANAGER: BRANCHES },
  "closing:validate": { OWNER: ALL, MANAGER: BRANCHES, AGENT: BRANCHES },
  "closing:reopen": {
    OWNER: { scope: "ALL", requiresReason: true },
    MANAGER: { scope: "BRANCHES", requiresReason: true },
  },
  "data:export": { OWNER: ALL, MANAGER: BRANCHES, AGENT: { scope: "OWN" } }, // agent: "limité"
  "subscription:manage": { OWNER: ALL },
  "audit:view": { OWNER: ALL, MANAGER: BRANCHES },
}

export type Actor = {
  memberId: string
  role: Role
  branchIds: readonly string[]
}

export type Target = {
  branchId?: string
  authorId?: string // member who entered the record
  createdAt?: Date // needed when the grant has a time window
}

export type DenyReason = "ROLE" | "BRANCH" | "NOT_AUTHOR" | "WINDOW_EXPIRED" | "MISSING_TARGET"

export type Decision =
  | { allowed: true; scope: Scope; requiresReason: boolean }
  | { allowed: false; reason: DenyReason }

// Deny by default: an unknown action or role has no grant, it never throws.
export function getGrant(role: Role, action: Action): Grant | null {
  return PERMISSIONS[action]?.[role] ?? null
}

export function authorize(
  actor: Actor,
  action: Action,
  target: Target = {},
  now: Date = new Date(),
): Decision {
  const grant = getGrant(actor.role, action)
  if (!grant) return { allowed: false, reason: "ROLE" }

  if (grant.scope === "BRANCHES" && target.branchId !== undefined) {
    if (!actor.branchIds.includes(target.branchId)) return { allowed: false, reason: "BRANCH" }
  }

  if (grant.scope === "OWN" && target.authorId !== undefined) {
    if (target.authorId !== actor.memberId) return { allowed: false, reason: "NOT_AUTHOR" }
  }

  if (grant.windowMinutes !== undefined) {
    if (!target.createdAt) return { allowed: false, reason: "MISSING_TARGET" }
    const elapsedMs = now.getTime() - target.createdAt.getTime()
    if (elapsedMs > grant.windowMinutes * 60_000) return { allowed: false, reason: "WINDOW_EXPIRED" }
  }

  return { allowed: true, scope: grant.scope, requiresReason: grant.requiresReason ?? false }
}

export function can(role: Role, action: Action): boolean {
  return getGrant(role, action) !== null
}

// Who may be invited: the owner is the creator of the organization and cannot be invited.
const INVITABLE_ROLES: Record<Role, readonly Role[]> = {
  OWNER: ["MANAGER", "AGENT"],
  MANAGER: ["AGENT"],
  AGENT: [],
}

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  return INVITABLE_ROLES[actorRole].includes(targetRole)
}

// A member can only manage members of a lower rank. Nobody manages an owner through this path.
export function canManageMember(actorRole: Role, targetRole: Role): boolean {
  return can(actorRole, "member:manage") && canAssignRole(actorRole, targetRole)
}
