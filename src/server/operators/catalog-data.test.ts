import { describe, expect, it } from "vitest"

import { OPERATOR_CATALOG } from "@/server/operators/catalog-data"

describe("OPERATOR_CATALOG", () => {
  it("has unique codes", () => {
    const codes = OPERATOR_CATALOG.map((operator) => operator.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("uses upper snake case codes", () => {
    for (const operator of OPERATOR_CATALOG) {
      expect(operator.code).toMatch(/^[A-Z][A-Z0-9_]*$/)
    }
  })

  it("uses 6-digit hex colours", () => {
    for (const operator of OPERATOR_CATALOG) {
      expect(operator.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it("contains the three launch operators", () => {
    expect(OPERATOR_CATALOG.map((operator) => operator.name)).toEqual([
      "Wave",
      "Orange Money",
      "Mixx by Yas",
    ])
  })
})
