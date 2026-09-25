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
      return `Annulation : ${operation.toLowerCase()}`
    case "MOVEMENT": {
      if (!movement) return "Mouvement interne"
      const label = MOVEMENT_LABELS[movement.kind]
      return movement.description ? `${label} · ${movement.description}` : label
    }
    case "ADJUSTMENT":
      return "Ajustement de clôture"
  }
}
