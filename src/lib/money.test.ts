import { describe, expect, it } from "vitest"

import { formatAmount, formatCompactAmount, formatFCFA, parseAmount } from "@/lib/money"

const NBSP = " "

describe("formatFCFA", () => {
  it("groups thousands with non-breaking spaces", () => {
    expect(formatFCFA(1250000)).toBe(`1${NBSP}250${NBSP}000${NBSP}FCFA`)
  })

  it("formats small amounts and zero", () => {
    expect(formatFCFA(0)).toBe(`0${NBSP}FCFA`)
    expect(formatFCFA(500)).toBe(`500${NBSP}FCFA`)
    expect(formatFCFA(1000)).toBe(`1${NBSP}000${NBSP}FCFA`)
  })

  it("keeps the sign of a negative difference", () => {
    expect(formatFCFA(-5000)).toBe(`-5${NBSP}000${NBSP}FCFA`)
  })

  it("refuses a non-integer amount", () => {
    expect(() => formatFCFA(10.5)).toThrow(RangeError)
    expect(() => formatAmount(Number.NaN)).toThrow(RangeError)
  })
})

describe("parseAmount", () => {
  it("reads digits with or without separators", () => {
    expect(parseAmount("25000")).toBe(25000)
    expect(parseAmount("1 250 000")).toBe(1250000)
    expect(parseAmount(`1${NBSP}250${NBSP}000`)).toBe(1250000)
  })

  it("returns null for an empty field", () => {
    expect(parseAmount("")).toBeNull()
    expect(parseAmount("   ")).toBeNull()
  })

  it("rejects anything that is not a whole number", () => {
    expect(parseAmount("12,5")).toBeNull()
    expect(parseAmount("12.5")).toBeNull()
    expect(parseAmount("-500")).toBeNull()
    expect(parseAmount("abc")).toBeNull()
    expect(parseAmount("10 FCFA")).toBeNull()
  })

  it("rejects numbers too large to be safe integers", () => {
    expect(parseAmount("99999999999999999999")).toBeNull()
  })
})

describe("formatCompactAmount", () => {
  it("keeps small amounts as they are", () => {
    expect(formatCompactAmount(0)).toBe("0")
    expect(formatCompactAmount(850)).toBe("850")
  })

  it("rounds thousands to k", () => {
    expect(formatCompactAmount(12_400)).toBe(`12${NBSP}k`)
    expect(formatCompactAmount(999_499)).toBe(`999${NBSP}k`)
  })

  it("shows millions with one decimal, without floats", () => {
    expect(formatCompactAmount(1_000_000)).toBe(`1${NBSP}M`)
    expect(formatCompactAmount(1_250_000)).toBe(`1,3${NBSP}M`)
    expect(formatCompactAmount(1_500_000)).toBe(`1,5${NBSP}M`)
    expect(formatCompactAmount(12_340_000)).toBe(`12,3${NBSP}M`)
  })

  it("keeps the sign", () => {
    expect(formatCompactAmount(-2_500)).toBe(`-3${NBSP}k`)
  })
})
