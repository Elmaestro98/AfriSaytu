import { describe, expect, it } from "vitest"

import { DEFAULT_FILTERS, MAX_LIMIT, historyQueryString, parseHistoryFilters } from "@/lib/history-filters"

describe("parseHistoryFilters", () => {
  it("uses the defaults for an empty address (today, mockup 06)", () => {
    expect(parseHistoryFilters({})).toEqual(DEFAULT_FILTERS)
  })

  it("reads every filter", () => {
    expect(
      parseHistoryFilters({ q: " 77 123 ", period: "7d", operator: "op1", type: "WITHDRAWAL", status: "CANCELLED", branch: "b1", agent: "m1", limit: "100" }),
    ).toEqual({ q: "77 123", period: "7d", operator: "op1", type: "WITHDRAWAL", status: "CANCELLED", branch: "b1", agent: "m1", limit: 100 })
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
