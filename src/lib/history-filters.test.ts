import { describe, expect, it } from "vitest"

import { DEFAULT_FILTERS, MAX_LIMIT, historyQueryString, parseHistoryFilters, parseRange } from "@/lib/history-filters"

describe("parseHistoryFilters", () => {
  it("uses the defaults for an empty address (today, mockup 06)", () => {
    expect(parseHistoryFilters({})).toEqual(DEFAULT_FILTERS)
  })

  it("reads every filter", () => {
    expect(
      parseHistoryFilters({ q: " 77 123 ", period: "7d", operator: "op1", type: "WITHDRAWAL", status: "CANCELLED", branch: "b1", agent: "m1", limit: "100" }),
    ).toEqual({ q: "77 123", period: "7d", range: null, operator: "op1", type: "WITHDRAWAL", status: "CANCELLED", branch: "b1", agent: "m1", limit: 100 })
  })

  it("ignores unknown or unsafe values", () => {
    const filters = parseHistoryFilters({ period: "forever", type: "LOAN", status: "DELETED", operator: "x'; drop", limit: "abc" })
    expect(filters).toEqual(DEFAULT_FILTERS)
  })

  it("caps the page size", () => {
    expect(parseHistoryFilters({ limit: "999999" }).limit).toBe(MAX_LIMIT)
    expect(parseHistoryFilters({ limit: "3" }).limit).toBe(DEFAULT_FILTERS.limit)
  })

  it("takes the first value when a parameter is repeated", () => {
    expect(parseHistoryFilters({ type: ["DEPOSIT", "SEND"] }).type).toBe("DEPOSIT")
  })
})

describe("historyQueryString", () => {
  it("writes only what differs from the defaults", () => {
    expect(historyQueryString(DEFAULT_FILTERS)).toBe("")
    expect(historyQueryString({ ...DEFAULT_FILTERS, period: "all", type: "SEND", q: "REF 1" })).toBe("?q=REF+1&period=all&type=SEND")
  })

  it("round-trips", () => {
    const filters = { ...DEFAULT_FILTERS, period: "30d" as const, operator: "op1", status: "VALID" as const, limit: 150 }
    const params = Object.fromEntries(new URLSearchParams(historyQueryString(filters)))
    expect(parseHistoryFilters(params)).toEqual(filters)
  })
})

describe("custom range (du ... au ...)", () => {
  it("reads two real days, in order", () => {
    expect(parseRange("2026-09-01", "2026-09-15")).toEqual({ from: "2026-09-01", to: "2026-09-15" })
    expect(parseRange("2026-09-15", "2026-09-01")).toEqual({ from: "2026-09-01", to: "2026-09-15" })
  })

  it("refuses a missing, false or too long range", () => {
    expect(parseRange("2026-09-01", undefined)).toBeNull()
    expect(parseRange("2026-02-30", "2026-03-02")).toBeNull()
    expect(parseRange("2025-01-01", "2026-09-15")).toBeNull()
  })

  it("replaces the period in the address, and comes back the same", () => {
    const filters = { ...DEFAULT_FILTERS, period: "7d" as const, range: { from: "2026-09-01", to: "2026-09-15" }, operator: "wave" }
    const query = historyQueryString(filters)
    expect(query).toBe("?from=2026-09-01&to=2026-09-15&operator=wave")
    expect(parseHistoryFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual({ ...filters, period: DEFAULT_FILTERS.period })
  })
})
