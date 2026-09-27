import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ActorContext } from "@/server/auth/actor"
import type { Actor } from "@/server/auth/permissions"
import { reportFileName } from "@/server/reports/download"
import { ReportError, loadMonthlyReport } from "@/server/reports/monthly"
import { loadStatsBetween, statsWhere } from "@/server/stats/load"

vi.mock("@/server/plans/current", () => ({
  getHistoryRetention: vi.fn(async () => ({ since: new Date("2026-06-27T00:00:00.000Z"), months: 3, planLabel: "Basic" })),
  getSubscriptionState: vi.fn(async () => ({ access: "FULL" })),
}))
vi.mock("@/server/stats/load", async (original) => ({
  ...(await original<typeof import("@/server/stats/load")>()),
  loadStatsBetween: vi.fn(async () => ({})),
}))
vi.mock("@/server/commissions/reconciliation", () => ({ loadReconciliation: vi.fn(async () => null) }))

const { getSubscriptionState } = await import("@/server/plans/current")
const NOW = new Date("2026-09-27T10:00:00.000Z")

// A context whose database answers with the branches of the actor's organization only (the
// tenant client adds the organization filter to every query, see db/tenant-scope.test.ts).
function context(actor: Actor, orgBranches = [{ id: "b1", name: "Kiosque UGB" }, { id: "b2", name: "Point Médina" }]) {
  const db = {
    branch: { findMany: vi.fn(async ({ where }: { where: { id?: { in: string[] } } }) => orgBranches.filter((branch) => !where.id || where.id.in.includes(branch.id))) },
    transaction: { count: vi.fn(async () => 0) },
    dailyClosing: { findMany: vi.fn(async () => []) },
    organization: { findFirst: vi.fn(async () => ({ name: "Africatech" })) },
  }
  return { ctx: { db, organizationId: "org_a", clerkOrgId: "org_clerk_a", userId: "user_a", actor, memberName: "Med" } as unknown as ActorContext, db }
}

const owner: Actor = { memberId: "m_owner", role: "OWNER", branchIds: [] }
const manager: Actor = { memberId: "m_manager", role: "MANAGER", branchIds: ["b1"] }
const agent: Actor = { memberId: "m_agent", role: "AGENT", branchIds: ["b1"] }

describe("loadMonthlyReport: who gets which report", () => {
  beforeEach(() => vi.clearAllMocks())

  it("refuses a branch of another organization before reading anything", async () => {
    const { ctx } = context(owner)
    await expect(loadMonthlyReport(ctx, "2026-08", "b_other_org", NOW)).rejects.toMatchObject({ status: 404 })
    expect(loadStatsBetween).not.toHaveBeenCalled()
  })

  it("refuses a manager a branch that is not theirs", async () => {
    const { ctx } = context(manager)
    await expect(loadMonthlyReport(ctx, "2026-08", "b2", NOW)).rejects.toBeInstanceOf(ReportError)
    expect(loadStatsBetween).not.toHaveBeenCalled()
  })

  it("narrows a manager's report to their chosen branch", async () => {
    const { ctx } = context(manager)
    const report = await loadMonthlyReport(ctx, "2026-08", "b1", NOW)
    expect(report.branchName).toBe("Kiosque UGB")
    expect(vi.mocked(loadStatsBetween).mock.calls[0][1].branchIds).toEqual(["b1"])
  })

  it("gives an agent their own operations and ignores any branch asked for", async () => {
    const { ctx, db } = context(agent)
    const report = await loadMonthlyReport(ctx, "2026-08", "b2", NOW)
    expect(report.scopeLabel).toBe("Vos opérations")
    expect(report.reconciliation).toBeNull()
    expect(db.branch.findMany).not.toHaveBeenCalled()
    expect(vi.mocked(loadStatsBetween).mock.calls[0][1].branchIds).toBeNull()
  })

  it("refuses a month outside the plan's history, or not a month at all", async () => {
    const { ctx } = context(owner)
    await expect(loadMonthlyReport(ctx, "2026-05", null, NOW)).rejects.toMatchObject({ status: 400 })
    await expect(loadMonthlyReport(ctx, "2026-13", null, NOW)).rejects.toMatchObject({ status: 400 })
    await expect(loadMonthlyReport(ctx, "2026-10", null, NOW)).rejects.toMatchObject({ status: 400 })
  })

  it("refuses a suspended account, keeps working in read only", async () => {
    const { ctx } = context(owner)
    vi.mocked(getSubscriptionState).mockResolvedValueOnce({ access: "BLOCKED" } as Awaited<ReturnType<typeof getSubscriptionState>>)
    await expect(loadMonthlyReport(ctx, "2026-08", null, NOW)).rejects.toMatchObject({ status: 403 })
    vi.mocked(getSubscriptionState).mockResolvedValueOnce({ access: "READ_ONLY" } as Awaited<ReturnType<typeof getSubscriptionState>>)
    await expect(loadMonthlyReport(ctx, "2026-08", null, NOW)).resolves.toMatchObject({ month: "2026-08" })
  })

  it("covers a month in progress up to now", async () => {
    const { ctx } = context(owner)
    const report = await loadMonthlyReport(ctx, "2026-09", null, NOW)
    expect(report).toMatchObject({ inProgress: true, lastDay: "2026-09-27", scopeLabel: "Tous les points de vente" })
    expect(vi.mocked(loadStatsBetween).mock.calls[0][1].chart.keys).toHaveLength(27)
  })
})

describe("statsWhere with a branch", () => {
  it("narrows inside what the actor may see, never widens it", () => {
    const range = { from: new Date("2026-08-01T00:00:00.000Z"), to: new Date("2026-08-31T23:59:59.999Z") }
    const where = statsWhere(manager, range, ["b2"]) as { AND: unknown[] }
    expect(where.AND[0]).toEqual({ branchId: { in: ["b1"] } }) // the manager's own view stays
    expect(where.AND[1]).toEqual({ branchId: { in: ["b2"] } }) // AND the narrowing: b2 gives nothing
  })
})

describe("reportFileName", () => {
  it("names the month, and the branch in safe characters", () => {
    expect(reportFileName("2026-09", null)).toBe("afrisaytu-rapport-2026-09.pdf")
    expect(reportFileName("2026-09", "Point Médina / Dakar")).toBe("afrisaytu-rapport-2026-09-point-medina-dakar.pdf")
    expect(reportFileName("2026-09", "\"; rm")).toBe("afrisaytu-rapport-2026-09-rm.pdf")
  })
})
