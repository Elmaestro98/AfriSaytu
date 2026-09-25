import { describe, expect, it } from "vitest"

import { deadlineLine, statusLabel, subscriptionBanner } from "@/server/plans/banner"
import type { SubscriptionState } from "@/server/plans/lifecycle"

const base: SubscriptionState = { status: "ACTIVE", access: "FULL", fromTrial: false, deadline: null, daysLeft: null }

describe("subscriptionBanner", () => {
  it("says nothing while a paid period runs, nor when suspended (own screen)", () => {
    expect(subscriptionBanner({ ...base, daysLeft: 20 }, true)).toBeNull()
    expect(subscriptionBanner({ ...base, status: "SUSPENDED", access: "BLOCKED" }, true)).toBeNull()
  })

  it("counts the trial days left, singular and plural", () => {
    expect(subscriptionBanner({ ...base, status: "TRIAL", fromTrial: true, daysLeft: 5 }, true)).toEqual({ tone: "info", text: "Essai gratuit : 5 jours restants." })
    expect(subscriptionBanner({ ...base, status: "TRIAL", fromTrial: true, daysLeft: 1 }, true)?.text).toBe("Essai gratuit : 1 jour restant.")
  })

  it("warns during the grace, after a trial or a paid period", () => {
    const afterTrial = subscriptionBanner({ ...base, status: "PAST_DUE", fromTrial: true, daysLeft: 3 }, true)
    expect(afterTrial).toEqual({ tone: "warning", text: "Votre essai gratuit est terminé. Encore 3 jours avant le passage en lecture seule." })
    expect(subscriptionBanner({ ...base, status: "PAST_DUE", daysLeft: 7 }, true)?.text).toMatch(/^Le paiement de l'abonnement est en retard\./)
  })

  it("tells the other members to warn the owner", () => {
    expect(subscriptionBanner({ ...base, status: "PAST_DUE", daysLeft: 2 }, false)?.text).toMatch(/Prévenez le propriétaire\.$/)
    expect(subscriptionBanner({ ...base, status: "READ_ONLY", access: "READ_ONLY" }, true)?.text).not.toMatch(/propriétaire/)
  })

  it("explains what still works in read only", () => {
    expect(subscriptionBanner({ ...base, status: "READ_ONLY", access: "READ_ONLY" }, true)?.tone).toBe("danger")
  })
})

describe("deadlineLine", () => {
  const deadline = new Date("2026-10-02T10:00:00.000Z")
  const format = (date: Date) => date.toISOString().slice(0, 10)

  it("names the end of the current step", () => {
    expect(deadlineLine({ ...base, status: "TRIAL", deadline }, format)).toBe("Fin de l'essai le 2026-10-02")
    expect(deadlineLine({ ...base, deadline }, format)).toBe("Prochaine échéance le 2026-10-02")
    expect(deadlineLine({ ...base, status: "PAST_DUE", deadline }, format)).toBe("Passage en lecture seule le 2026-10-02")
  })

  it("gives nothing without a date", () => {
    expect(deadlineLine(base, format)).toBeNull()
    expect(deadlineLine({ ...base, status: "READ_ONLY", access: "READ_ONLY" }, format)).toBeNull()
  })
})

describe("statusLabel", () => {
  it("does not call an ended trial a late payment", () => {
    expect(statusLabel({ ...base, status: "PAST_DUE", fromTrial: true })).toBe("Essai terminé")
    expect(statusLabel({ ...base, status: "PAST_DUE" })).toBe("Paiement en retard")
  })
})
