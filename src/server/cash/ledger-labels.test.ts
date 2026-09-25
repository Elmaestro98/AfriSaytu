import { describe, expect, it } from "vitest"

import { ledgerLabel } from "@/server/cash/ledger-labels"

const deposit = { type: "DEPOSIT" as const, operatorName: "Wave" }

describe("ledgerLabel", () => {
  it("names every kind of ledger line", () => {
    expect(ledgerLabel({ reason: "OPENING", transaction: null, movement: null })).toBe("Solde d'ouverture")
    expect(ledgerLabel({ reason: "TRANSACTION", transaction: deposit, movement: null })).toBe("Dépôt Wave")
    expect(ledgerLabel({ reason: "CANCELLATION", transaction: deposit, movement: null })).toBe("Annulation : dépôt wave")
    expect(ledgerLabel({ reason: "ADJUSTMENT", transaction: null, movement: null })).toBe("Ajustement de clôture")
    expect(ledgerLabel({ reason: "CANCELLATION", transaction: null, movement: null })).toBe("Annulation d'ajustement (clôture rouverte)")
  })

  it("adds the description of a movement", () => {
    expect(
      ledgerLabel({ reason: "MOVEMENT", transaction: null, movement: { kind: "CASH_OUT", description: "Reçu VR-882" } }),
    ).toBe("Retrait de caisse · Reçu VR-882")
    expect(ledgerLabel({ reason: "MOVEMENT", transaction: null, movement: { kind: "UV_TOPUP", description: null } })).toBe(
      "Approvisionnement UV",
    )
  })
})
