import { describe, expect, it } from "vitest"

import { buildAlerts, type AlertInput } from "@/server/dashboard/alerts"

const empty: AlertInput = {
  lowBalances: [],
  noRuleCount: 0,
  closingsWithDifference: [],
  staleBranches: [],
  showBranch: false,
  canManageRules: true,
}

describe("buildAlerts", () => {
  it("is empty when all is well", () => {
    expect(buildAlerts(empty)).toEqual([])
  })

  it("puts closing differences first, then balances, stale days and missing rules", () => {
    const alerts = buildAlerts({
      ...empty,
      noRuleCount: 3,
      lowBalances: [{ label: "Mixx by Yas", branchName: "Médina", missing: 80_000 }],
      closingsWithDifference: [{ branchName: "Médina", difference: -5_000 }],
      staleBranches: [{ name: "Plateau", hoursOpen: 30.5 }],
    })
    expect(alerts.map((alert) => alert.key)).toEqual(["closing-Médina", "low-Médina-Mixx by Yas", "stale-Plateau", "no-rule"])
    expect(alerts[0]).toMatchObject({ level: "danger", title: "Écart de clôture : -5 000 FCFA" })
    expect(alerts[2].detail).toBe("Plateau · ouverte depuis 30 h")
  })

  it("names the branch of a low balance only with several branches", () => {
    const one = buildAlerts({ ...empty, lowBalances: [{ label: "Caisse espèces", branchName: "Médina", missing: 1_000 }] })
    expect(one[0].detail).toBe("Manque 1 000 FCFA")
    const many = buildAlerts({ ...empty, showBranch: true, lowBalances: [{ label: "Caisse espèces", branchName: "Médina", missing: 1_000 }] })
    expect(many[0].detail).toBe("Manque 1 000 FCFA · Médina")
  })

  it("only tells about missing rules to those who can fix them", () => {
    expect(buildAlerts({ ...empty, noRuleCount: 2, canManageRules: false })).toEqual([])
  })
})
