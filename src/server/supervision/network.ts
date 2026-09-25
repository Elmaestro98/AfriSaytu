import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { periodRanges, type SupervisionPeriod } from "@/server/supervision/compute"
import { inScope } from "@/server/supervision/overview"

export type AgentPerformance = {
  memberId: string
  name: string
  branchNames: string[]
  count: number
  share: number // part of the operations of the period, 0 to 1
  volume: number
  commission: number
  closingDifference: number // sum of the differences of the closings they validated
  closingCount: number
}

export type ClosingRow = {
  id: string
  branchId: string
  branchName: string
  closedAt: Date | null
  closedByName: string | null
  cashCounted: number
  uvDifference: number
  cashDifference: number
  status: "OPEN" | "CLOSED" | "REOPENED"
}

export type Network = {
  agents: AgentPerformance[]
  closings: ClosingRow[]
  closingDifference: number // cumulated difference of the locked closings of the period
  anomalies: number // locked closings with a difference
  canReopen: boolean
}

export async function loadNetwork(ctx: ActorContext, scope: string[] | null, period: SupervisionPeriod, now: Date): Promise<Network> {
  const { current } = periodRanges(period, now)
  const closingScope = scope ? { branchId: { in: scope } } : {}

  const [byMember, periodClosings, latestClosings] = await Promise.all([
    ctx.db.transaction.groupBy({
      by: ["memberId"],
      where: { ...inScope(scope), status: "VALID", createdAt: { gte: current.from, lte: current.to } },
      _count: { _all: true },
      _sum: { amount: true, commission: true },
    }),
    ctx.db.dailyClosing.findMany({
      where: { ...closingScope, status: "CLOSED", closedAt: { gte: current.from, lte: current.to } },
      select: { closedById: true, lines: { select: { difference: true } } },
    }),
    ctx.db.dailyClosing.findMany({
      where: { ...closingScope, status: { not: "OPEN" } },
      orderBy: { closedAt: "desc" },
      take: 8,
      select: {
        id: true,
        branchId: true,
        closedAt: true,
        status: true,
        branch: { select: { name: true } },
        closedBy: { select: { name: true } },
        lines: { select: { difference: true, countedBalance: true, account: { select: { kind: true } } } },
      },
    }),
  ])

  const members = await ctx.db.member.findMany({
    where: { id: { in: byMember.map((row) => row.memberId) } },
    select: { id: true, name: true, branches: { select: { branch: { select: { name: true } } } } },
  })
  const memberById = new Map(members.map((member) => [member.id, member]))
  const totalCount = byMember.reduce((sum, row) => sum + row._count._all, 0)

  const differenceOf = (lines: readonly { difference: number }[]) => lines.reduce((sum, line) => sum + line.difference, 0)
  const closingsBy = new Map<string, { difference: number; count: number }>()
  for (const closing of periodClosings) {
    if (!closing.closedById) continue
    const entry = closingsBy.get(closing.closedById) ?? { difference: 0, count: 0 }
    entry.difference += differenceOf(closing.lines)
    entry.count += 1
    closingsBy.set(closing.closedById, entry)
  }

  return {
    closingDifference: periodClosings.reduce((sum, closing) => sum + differenceOf(closing.lines), 0),
    anomalies: periodClosings.filter((closing) => differenceOf(closing.lines) !== 0).length,
    canReopen: authorize(ctx.actor, "closing:reopen").allowed,
    agents: byMember
      .map((row) => ({
        memberId: row.memberId,
        name: memberById.get(row.memberId)?.name ?? "Membre",
        branchNames: memberById.get(row.memberId)?.branches.map((link) => link.branch.name) ?? [],
        count: row._count._all,
        share: totalCount > 0 ? row._count._all / totalCount : 0,
        volume: row._sum.amount ?? 0,
        commission: row._sum.commission ?? 0,
        closingDifference: closingsBy.get(row.memberId)?.difference ?? 0,
        closingCount: closingsBy.get(row.memberId)?.count ?? 0,
      }))
      .sort((a, b) => b.volume - a.volume),
    closings: latestClosings.map((closing) => ({
      id: closing.id,
      branchId: closing.branchId,
      branchName: closing.branch.name,
      closedAt: closing.closedAt,
      closedByName: closing.closedBy?.name ?? null,
      cashCounted: closing.lines.filter((line) => line.account.kind === "CASH").reduce((sum, line) => sum + line.countedBalance, 0),
      uvDifference: differenceOf(closing.lines.filter((line) => line.account.kind === "OPERATOR")),
      cashDifference: differenceOf(closing.lines.filter((line) => line.account.kind === "CASH")),
      status: closing.status,
    })),
  }
}
