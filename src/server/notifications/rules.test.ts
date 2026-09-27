import { describe, expect, it } from "vitest"

import { kindsFor, recipients, type Candidate } from "@/server/notifications/kinds"
import { closingGapMessage, lowBalanceMessage, subscriptionMessage } from "@/server/notifications/messages"
import { isLowBalance, tierEvents } from "@/server/notifications/rules"

// Tiers like the admin's Wave scale: 0-999 999 -> 3 000, 1 000 000-1 499 999 -> 5 000, 1 500 000+ -> 6 650.
const SCALE = [
  { minAmount: 0, maxAmount: 999_999, commission: 3_000 },
  { minAmount: 1_000_000, maxAmount: 1_499_999, commission: 5_000 },
  { minAmount: 1_500_000, maxAmount: null, commission: 6_650 },
]

describe("tierEvents", () => {
  it("announces the next tier once 20 % or less of the gap is missing", () => {
    // Gap 1 000 000 -> 1 500 000 = 500 000; 20 % = 100 000.
    expect(tierEvents(SCALE, 1_350_000, 1_390_000)).toEqual([])
    expect(tierEvents(SCALE, 1_350_000, 1_400_000)).toEqual([{ kind: "near", number: 3, missing: 100_000, commission: 6_650 }])
  })

  it("announces a tier reached, and the next one when it is already close", () => {
    expect(tierEvents(SCALE, 990_000, 1_010_000)).toEqual([{ kind: "reached", number: 2, commission: 5_000 }])
    expect(tierEvents(SCALE, 1_200_000, 1_600_000)).toEqual([{ kind: "reached", number: 3, commission: 6_650 }])
  })

  it("says nothing when the volume did not grow, or past the last tier", () => {
    expect(tierEvents(SCALE, 1_400_000, 1_400_000)).toEqual([])
    expect(tierEvents(SCALE, 2_000_000, 2_500_000)).toEqual([])
  })

  it("counts the first tier from zero", () => {
    const scale = [{ minAmount: 10_000, maxAmount: null, commission: 100 }]
    expect(tierEvents(scale, 0, 8_000)).toEqual([{ kind: "near", number: 1, missing: 2_000, commission: 100 }])
    expect(tierEvents(scale, 8_000, 10_000)).toEqual([{ kind: "reached", number: 1, commission: 100 }])
  })

  it("works with an unsorted scale and a gap between tiers", () => {
    const scale = [{ minAmount: 10_000, maxAmount: null, commission: 200 }, { minAmount: 0, maxAmount: 9_995, commission: 100 }]
    expect(tierEvents(scale, 9_000, 9_998)).toEqual([{ kind: "near", number: 2, missing: 2, commission: 200 }])
  })
})

describe("isLowBalance", () => {
  it("needs a threshold and a balance strictly below it", () => {
    expect(isLowBalance(40_000, 50_000)).toBe(true)
    expect(isLowBalance(50_000, 50_000)).toBe(false)
    expect(isLowBalance(-1, null)).toBe(false)
  })
})

describe("recipients", () => {
  const members: Candidate[] = [
    { id: "owner", role: "OWNER", branchIds: [], muted: [] },
    { id: "manager_b1", role: "MANAGER", branchIds: ["b1"], muted: [] },
    { id: "agent_b1", role: "AGENT", branchIds: ["b1"], muted: [] },
    { id: "agent_b2", role: "AGENT", branchIds: ["b2"], muted: [] },
    { id: "agent_b1_muted", role: "AGENT", branchIds: ["b1"], muted: ["LOW_BALANCE"] },
  ]

  it("sends a branch's news to its members and the owner, never to another branch", () => {
    expect(recipients(members, { kind: "LOW_BALANCE", branchId: "b1" })).toEqual(["owner", "manager_b1", "agent_b1"])
  })

  it("keeps closing gaps for the owner and managers, without the member who validated", () => {
    expect(recipients(members, { kind: "CLOSING_GAP", branchId: "b1", exclude: "manager_b1" })).toEqual(["owner"])
  })

  it("keeps subscription news for the owner", () => {
    expect(recipients(members, { kind: "SUBSCRIPTION", branchId: null })).toEqual(["owner"])
  })

  it("offers each role only its kinds", () => {
    expect(kindsFor("AGENT")).toEqual(["LOW_BALANCE", "DAILY_TIER", "CLOSING_REMINDER"])
    expect(kindsFor("OWNER")).toHaveLength(5)
  })
})

describe("messages", () => {
  it("shows amounts but never a customer number", () => {
    const message = lowBalanceMessage({ accountId: "a1", accountLabel: "Orange Money", branchName: "Kiosque UGB", balance: 45_000, threshold: 50_000 })
    expect(message.title).toBe("Solde bas : Orange Money")
    expect(message.body).toBe("45 000 FCFA (seuil 50 000 FCFA) · Kiosque UGB. Pensez à approvisionner.")
  })

  it("sums up a closing gap", () => {
    const message = closingGapMessage({ closingId: "c1", branchName: "UGB", authorName: "Awa", lines: [{ label: "Espèces", difference: -5_000 }, { label: "Wave", difference: 0 }] })
    expect(message.title).toBe("Écart de clôture : -5 000 FCFA")
    expect(message.body).toBe("UGB · validée par Awa. Espèces -5 000 FCFA.")
  })

  it("names the subscription stage and the days left", () => {
    expect(subscriptionMessage({ daysLeft: 3, stage: "TRIAL" }).title).toBe("Votre essai gratuit se termine dans 3 jours")
    expect(subscriptionMessage({ daysLeft: 1, stage: "ACTIVE" }).title).toBe("Votre abonnement se termine demain")
  })
})
