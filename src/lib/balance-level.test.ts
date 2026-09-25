import { describe, expect, it } from "vitest"

import { balanceLevel } from "@/lib/balance-level"

describe("balanceLevel", () => {
  it("shows the mockup case: Mixx 420 000 under a 500 000 threshold, 80 000 missing", () => {
    expect(balanceLevel(420_000, 500_000)).toEqual({ hasThreshold: true, low: true, missing: 80_000, fill: 0.42 })
  })

  it("is not low at the threshold, and half full there", () => {
    expect(balanceLevel(300_000, 300_000)).toMatchObject({ low: false, missing: 0, fill: 0.5 })
  })

  it("caps the gauge between empty and full", () => {
    expect(balanceLevel(5_000_000, 300_000).fill).toBe(1)
    expect(balanceLevel(-10_000, 300_000)).toMatchObject({ low: true, missing: 310_000, fill: 0 })
  })

  it("has no gauge without a threshold", () => {
    expect(balanceLevel(1_000, null)).toEqual({ hasThreshold: false, low: false, missing: 0, fill: 0 })
    expect(balanceLevel(1_000, 0).hasThreshold).toBe(false)
  })
})
