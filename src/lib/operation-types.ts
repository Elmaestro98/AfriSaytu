// Operation types and their French labels, shown in the interface.
export const TRANSACTION_TYPES = ["DEPOSIT", "WITHDRAWAL", "SEND", "AIRTIME", "BILL", "OTHER"] as const

export type TransactionTypeKey = (typeof TRANSACTION_TYPES)[number]

export const TYPE_LABELS: Record<TransactionTypeKey, string> = {
  DEPOSIT: "Dépôt",
  WITHDRAWAL: "Retrait",
  SEND: "Envoi",
  AIRTIME: "Crédit",
  BILL: "Facture",
  OTHER: "Autre",
}
