// Internal movements (cahier 6.2) and their French labels.
export const MOVEMENT_KINDS = ["UV_TOPUP", "UV_SELL", "CASH_IN", "CASH_OUT", "TRANSFER", "COMMISSION_PAYOUT"] as const

export type MovementKindKey = (typeof MOVEMENT_KINDS)[number]

export const MOVEMENT_LABELS: Record<MovementKindKey, string> = {
  UV_TOPUP: "Approvisionnement UV",
  UV_SELL: "Vente d'UV",
  CASH_IN: "Apport en caisse",
  CASH_OUT: "Retrait de caisse",
  TRANSFER: "Transfert entre opérateurs",
  COMMISSION_PAYOUT: "Versement de commissions",
}

export const MOVEMENT_HELP: Record<MovementKindKey, string> = {
  UV_TOPUP: "Achat d'unités électroniques auprès d'un distributeur.",
  UV_SELL: "Dégagement : vous revendez des unités électroniques.",
  CASH_IN: "Fond de caisse apporté par le gérant.",
  CASH_OUT: "Versement au gérant, dépôt en banque ou dépense.",
  TRANSFER: "Des unités passent d'un opérateur à un autre.",
  COMMISSION_PAYOUT: "Commission réellement reçue de l'opérateur, pour comparer avec l'estimation.",
}
