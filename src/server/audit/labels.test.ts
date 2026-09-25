import { describe, expect, it } from "vitest"

import { AUDIT_ACTIONS } from "@/lib/audit-actions"
import { describeAudit } from "@/server/audit/labels"

const NBSP = " "
const fcfa = (digits: string) => `${digits.replace(/ /g, NBSP)}${NBSP}FCFA`

describe("describeAudit", () => {
  it("has a French title for every journaled action", () => {
    for (const [action, title] of Object.entries(AUDIT_ACTIONS)) {
      expect(describeAudit({ action, before: null, after: null }).title).toBe(title)
    }
  })

  it("details a cancellation with its type and amount", () => {
    const result = describeAudit({ action: "transaction.cancel", before: { status: "VALID", type: "WITHDRAWAL", amount: 25_000 }, after: { status: "CANCELLED" } })
    expect(result).toEqual({ title: "Annulation d'opération", detail: `Retrait de ${fcfa("25 000")}` })
  })

  it("details a closing difference with its sign, or no difference", () => {
    expect(describeAudit({ action: "closing.validate", before: null, after: { totalDifference: -1_500 } }).detail).toBe(`Écart ${fcfa("-1 500")}`)
    expect(describeAudit({ action: "closing.validate", before: null, after: { totalDifference: 2_000 } }).detail).toBe(`Écart +${fcfa("2 000")}`)
    expect(describeAudit({ action: "closing.validate", before: null, after: { totalDifference: 0 } }).detail).toBe("Aucun écart")
  })

  it("details an export and an invitation", () => {
    expect(describeAudit({ action: "data.export", before: null, after: { format: "xlsx", count: 12 } }).detail).toBe("12 opérations en XLSX")
    expect(describeAudit({ action: "member.invite", before: null, after: { email: "awa@exemple.sn", role: "AGENT" } }).detail).toBe("awa@exemple.sn · Agent")
  })

  it("only reports a threshold change when the threshold changed", () => {
    expect(describeAudit({ action: "account.update", before: { alertThreshold: 50_000 }, after: { alertThreshold: 50_000 } }).detail).toBeNull()
    expect(describeAudit({ action: "account.update", before: { alertThreshold: 50_000 }, after: { alertThreshold: null } }).detail).toBe("Seuil d'alerte retiré")
  })

  it("ignores malformed stored values instead of showing them raw", () => {
    expect(describeAudit({ action: "transaction.cancel", before: { amount: "25000", type: 3 }, after: null }).detail).toBeNull()
    expect(describeAudit({ action: "member.invite", before: null, after: { role: "ADMIN" } }).detail).toBeNull()
    expect(describeAudit({ action: "closing.validate", before: null, after: [1, 2] }).detail).toBeNull()
  })

  it("falls back to the raw action name when it is unknown", () => {
    expect(describeAudit({ action: "something.new", before: null, after: null })).toEqual({ title: "something.new", detail: null })
  })
})
