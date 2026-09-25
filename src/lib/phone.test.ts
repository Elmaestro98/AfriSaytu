import { describe, expect, it } from "vitest"

import { formatPhone, maskPhone, normalizePhone } from "@/lib/phone"

describe("normalizePhone", () => {
  it("accepts 9 digits written in common ways", () => {
    expect(normalizePhone("771234567")).toBe("771234567")
    expect(normalizePhone("77 123 45 67")).toBe("771234567")
    expect(normalizePhone("77.123.45.67")).toBe("771234567")
    expect(normalizePhone("77-123-45-67")).toBe("771234567")
  })

  it("strips the country code", () => {
    expect(normalizePhone("+221 77 123 45 67")).toBe("771234567")
    expect(normalizePhone("00221771234567")).toBe("771234567")
  })

  it("rejects numbers that are too short, too long or not numeric", () => {
    expect(normalizePhone("77123456")).toBeNull()
    expect(normalizePhone("7712345678")).toBeNull()
    expect(normalizePhone("77 abc 45 67")).toBeNull()
    expect(normalizePhone("")).toBeNull()
  })
})

describe("formatPhone and maskPhone", () => {
  it("formats in groups", () => {
    expect(formatPhone("771234567")).toBe("77 123 45 67")
  })

  it("masks the middle digits as 77 *** ** 67", () => {
    expect(maskPhone("771234567")).toBe("77 *** ** 67")
  })

  it("refuses input that is not 9 digits", () => {
    expect(() => formatPhone("1234")).toThrow(RangeError)
    expect(() => maskPhone("12345678a")).toThrow(RangeError)
  })
})
