import { authorize, type Actor, type DenyReason } from "@/server/auth/permissions"

// Pure: may this person cancel this operation now? Used for the list (show the button) and by
// the Server Action (the real check).

export type CancellableOperation = {
  status: "VALID" | "CANCELLED"
  branchId: string
  memberId: string // author
  createdAt: Date
  closingId: string | null // attached to a closed day: locked
}

const DENY_MESSAGES: Record<DenyReason, string> = {
  ROLE: "Vous ne pouvez pas annuler d'opération.",
  BRANCH: "Cette opération appartient à un autre point de vente.",
  NOT_AUTHOR: "Vous ne pouvez annuler que vos propres opérations.",
  WINDOW_EXPIRED: "Le délai de 15 minutes est dépassé. Demandez au gérant d'annuler.",
  MISSING_TARGET: "Opération introuvable.",
}

export function planCancellation(
  actor: Actor,
  operation: CancellableOperation,
  now: Date,
): { ok: true } | { ok: false; error: string } {
  if (operation.status === "CANCELLED") return { ok: false, error: "Cette opération est déjà annulée." }
  if (operation.closingId !== null) {
    return { ok: false, error: "La journée de cette opération est clôturée. Le gérant doit d'abord la rouvrir." }
  }

  const decision = authorize(
    actor,
    "transaction:cancel",
    { branchId: operation.branchId, authorId: operation.memberId, createdAt: operation.createdAt },
    now,
  )
  return decision.allowed ? { ok: true } : { ok: false, error: DENY_MESSAGES[decision.reason] }
}
