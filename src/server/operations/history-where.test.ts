import { describe, expect, it } from "vitest"

import { DEFAULT_FILTERS } from "@/lib/history-filters"
import type { Actor } from "@/server/auth/permissions"
import { buildHistoryWhere, periodWhere, rangeWhere, searchWhere } from "@/server/operations/history-where"

const NOW = new Date("2026-09-25T15:00:00.000Z")
const owner: Actor = { memberId: "owner", role: "OWNER", branchIds: [] }
const manager: Actor = { memberId: "manager", role: "MANAGER", branchIds: ["b1"] }
const agent: Actor = { memberId: "agent", role: "AGENT", branchIds: ["b1"] }

describe("periodWhere (Dakar days)", () => {
  it("covers today, yesterday, 7 and 30 days", () => {
    expect(periodWhere("today", NOW)).toEqual({ createdAt: { gte: new Date("2026-09-25T00:00:00.000Z") } })
    expect(periodWhere("yesterday", NOW)).toEqual({
      createdAt: { gte: new Date("2026-09-24T00:00:00.000Z"), lt: new Date("2026-09-25T00:00:00.000Z") },
    })
    expect(periodWhere("7d", NOW)).toEqual({ createdAt: { gte: new Date("2026-09-19T00:00:00.000Z") } })
    expect(periodWhere("30d", NOW)).toEqual({ createdAt: { gte: new Date("2026-08-27T00:00:00.000Z") } })
    expect(periodWhere("all", NOW)).toEqual({})
  })
})

describe("searchWhere", () => {
  it("searches a number as phone, reference or exact amount", () => {
    expect(searchWhere("25 000")).toEqual({
      OR: [
        { reference: { contains: "25 000", mode: "insensitive" } },
        { customerPhone: { contains: "25000" } },
        { amount: 25_000 },
      ],
    })
  })

  it("drops the country code of a phone number", () => {
    const where = searchWhere("+221 77 123 45 67")
    expect(where.OR).toContainEqual({ customerPhone: { contains: "771234567" } })
  })

  it("searches text as a reference only", () => {
    expect(searchWhere("wv-892")).toEqual({ reference: { contains: "wv-892", mode: "insensitive" } })
  })

  it("does nothing for an empty search", () => {
    expect(searchWhere("  ")).toEqual({})
  })
})

describe("buildHistoryWhere", () => {
  it("never lets a filter widen what the user may see", () => {
    const where = buildHistoryWhere({ ...DEFAULT_FILTERS, period: "all", branch: "b2" }, manager, NOW)
    expect(where.AND).toEqual([{ branchId: { in: ["b1"] } }, { branchId: "b2" }])
  })

  it("keeps an agent on their own operations, even with an agent filter", () => {
    const where = buildHistoryWhere({ ...DEFAULT_FILTERS, period: "all", agent: "someone-else" }, agent, NOW)
    expect(where.AND).toEqual([{ memberId: "agent" }])
  })

  it("combines every filter for the owner", () => {
    const where = buildHistoryWhere(
      { ...DEFAULT_FILTERS, period: "all", operator: "op", type: "SEND", status: "VALID", agent: "m1" },
      owner,
      NOW,
    )
    expect(where.AND).toEqual([{ memberId: "m1" }, { operatorId: "op" }, { type: "SEND" }, { status: "VALID" }])
  })
})

describe("buildHistoryWhere with the plan retention", () => {
  it("hides what is older than the plan shows, on top of the other filters", () => {
    const since = new Date("2026-06-25T00:00:00.000Z")
    const where = buildHistoryWhere({ ...DEFAULT_FILTERS, period: "all" }, agent, NOW, since)
    expect(where).toEqual({ AND: [{ memberId: "agent" }, { createdAt: { gte: since } }] })
  })

  it("adds nothing when the plan shows everything", () => {
    expect(buildHistoryWhere({ ...DEFAULT_FILTERS, period: "all" }, owner, NOW, null)).toEqual({ AND: [] })
  })
})

describe("rangeWhere (du ... au ...)", () => {
  it("covers both days entirely, in Dakar time", () => {
    expect(rangeWhere({ from: "2026-09-01", to: "2026-09-15" })).toEqual({
      createdAt: { gte: new Date("2026-09-01T00:00:00.000Z"), lte: new Date("2026-09-15T23:59:59.999Z") },
    })
  })

  it("replaces the period, and combines with the operator", () => {
    const where = buildHistoryWhere({ ...DEFAULT_FILTERS, range: { from: "2026-09-01", to: "2026-09-15" }, operator: "wave" }, owner, NOW)
    expect(where).toEqual({ AND: [rangeWhere({ from: "2026-09-01", to: "2026-09-15" }), { operatorId: "wave" }] })
  })
})
