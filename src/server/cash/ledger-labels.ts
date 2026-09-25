import type { LedgerReason, MovementKind, TransactionType } from "@/generated/prisma/enums"
import { MOVEMENT_LABELS } from "@/lib/movement-kinds"
import { TYPE_LABELS } from "@/lib/operation-types"

export type LedgerSource = {
  reason: LedgerReason
  transaction: { type: TransactionType; operatorName: string } | null
  movement: { kind: MovementKind; description: string | null } | null
}

// Plain French label of a ledger line, from what created it.
export function ledgerLabel({ reason, transaction, movement }: LedgerSource): string {
  const operation = transaction ? `${TYPE_LABELS[transaction.type]} ${transaction.operatorName}` : "Opération"
  switch (reason) {
    case "OPENING":
      return "Solde d'ouverture"
    case "TRANSACTION":
      return operation
    case "CANCELLATION":
      // A counter-entry without an operation reverses a closing adjustment (reopened closing).
      // Only the type is lowered ("retrait"): the operator keeps its name ("Mixx by Yas").
      return transaction
        ? `Annulation : ${TYPE_LABELS[transaction.type].toLowerCase()} ${transaction.operatorName}`
        : "Annulation d'ajustement (clôture rouverte)"
    case "MOVEMENT": {
      if (!movement) return "Mouvement interne"
      const label = MOVEMENT_LABELS[movement.kind]
      return movement.description ? `${label} · ${movement.description}` : label
    }
    case "ADJUSTMENT":
      return "Ajustement de clôture"
  }
}
