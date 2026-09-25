import { describe, expect, it } from "vitest"

import { applyAmountKey } from "@/lib/amount-keys"

describe("applyAmountKey", () => {
  it("appends digits and double zero", () => {
    expect(applyAmountKey(0, "2")).toBe(2)
    expect(applyAmountKey(25, "00")).toBe(2_500)
    expect(applyAmountKey(2_500, "0")).toBe(25_000)
  })

  it("ignores leading zeros", () => {
    expect(applyAmountKey(0, "0")).toBe(0)
    expect(applyAmountKey(0, "00")).toBe(0)
  })

  it("erases the last digit, and clears", () => {
    expect(applyAmountKey(25_000, "back")).toBe(2_500)
    expect(applyAmountKey(7, "back")).toBe(0)
    expect(applyAmountKey(0, "back")).toBe(0)
    expect(applyAmountKey(25_000, "clear")).toBe(0)
  })

  it("stops at 10 digits", () => {
    expect(applyAmountKey(1_234_567_890, "1")).toBe(1_234_567_890)
    expect(applyAmountKey(123_456_789, "00")).toBe(123_456_789)
  })
})
