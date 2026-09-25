import { LedgerReason } from "@/generated/prisma/enums"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import type { ClosingAccount } from "@/server/closing/compute"
import type { TenantClient } from "@/server/db/tenant"
import { getBalances } from "@/server/ledger/balances"

// The current "day" of a branch is everything not yet attached to a closing (cahier 6.5: the
// period between two closings, not midnight to midnight). No clock comparison is needed.

type Reader = Pick<TenantClient, "account" | "ledgerEntry" | "dailyClosing">

export type PeriodAccount = ClosingAccount & { kind: "OPERATOR" | "CASH"; color: string | null }

export async function lastClosedClosing(db: Pick<TenantClient, "dailyClosing">, branchId: string) {
  return db.dailyClosing.findFirst({
    where: { branchId, status: "CLOSED" },
    orderBy: { closedAt: "desc" },
    select: { id: true, closedAt: true, lines: { select: { accountId: true, countedBalance: true } } },
  })
}

// Accounts of the branch with their opening balance (counted at the previous closing, or the
// opening balance entered at setup) and their theoretical balance (ledger now).
export async function loadPeriodAccounts(db: Reader, branchId: string): Promise<{ accounts: PeriodAccount[]; previousClosingId: string | null; since: Date | null }> {
  const [accounts, previous] = await Promise.all([
    db.account.findMany({
      where: { branchId, isActive: true },
      orderBy: [{ kind: "asc" }, { label: "asc" }],
      select: { id: true, label: true, kind: true, operator: { select: { color: true } } },
    }),
    lastClosedClosing(db, branchId),
  ])
  const ids = accounts.map((account) => account.id)
  const [theoretical, openings] = await Promise.all([
    getBalances(db, ids),
    db.ledgerEntry.groupBy({
      by: ["accountId"],
      where: { accountId: { in: ids }, reason: LedgerReason.OPENING },
      _sum: { delta: true },
    }),
  ])
  const counted = new Map(previous?.lines.map((line) => [line.accountId, line.countedBalance]) ?? [])
  const initial = new Map(openings.map((row) => [row.accountId, row._sum.delta ?? 0]))

  return {
    previousClosingId: previous?.id ?? null,
    since: previous?.closedAt ?? null,
    accounts: accounts.map((account) => ({
      id: account.id,
      label: account.label,
      kind: account.kind,
      color: account.operator?.color ?? null,
      opening: counted.get(account.id) ?? initial.get(account.id) ?? 0,
      theoretical: theoretical.get(account.id) ?? 0,
    })),
  }
}

export type RecapRow = { operatorName: string; color: string | null; count: number; volume: number; commission: number }

export type ClosingHistoryRow = {
  id: string
  closedAt: Date | null
  closedByName: string | null
  status: "OPEN" | "CLOSED" | "REOPENED"
  totalDifference: number
  canReopen: boolean
}

export type ClosingContext = {
  branches: { id: string; name: string }[]
  branchId: string
  previousClosingId: string | null
  since: Date | null
  accounts: PeriodAccount[]
  recap: RecapRow[]
  threshold: number
  canValidate: boolean
  history: ClosingHistoryRow[]
}

export async function loadClosingContext(ctx: ActorContext, requestedBranchId?: string): Promise<ClosingContext | null> {
  const branches = await ctx.db.branch.findMany({
    where: { isActive: true, ...(ctx.actor.role === "OWNER" ? {} : { id: { in: [...ctx.actor.branchIds] } }) },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  })
  const branch = branches.find((item) => item.id === requestedBranchId) ?? branches[0]
  if (!branch) return null

  const [period, recap, organization, closings] = await Promise.all([
    loadPeriodAccounts(ctx.db, branch.id),
    ctx.db.transaction.groupBy({
      by: ["operatorId"],
      where: { branchId: branch.id, closingId: null, status: "VALID" },
      _count: { _all: true },
      _sum: { amount: true, commission: true },
    }),
    ctx.db.organization.findFirst({ select: { closingDiffThreshold: true } }),
    ctx.db.dailyClosing.findMany({
      where: { branchId: branch.id, status: { not: "OPEN" } },
      orderBy: { openedAt: "desc" },
      take: 10,
      select: { id: true, closedAt: true, status: true, closedBy: { select: { name: true } }, lines: { select: { difference: true } } },
    }),
  ])

  const operators = await ctx.db.operatorCatalog.findMany({
    where: { id: { in: recap.map((row) => row.operatorId) } },
    select: { id: true, name: true, color: true },
  })
  const operatorById = new Map(operators.map((operator) => [operator.id, operator]))
  const canReopen = authorize(ctx.actor, "closing:reopen", { branchId: branch.id }).allowed

  return {
    branches,
    branchId: branch.id,
    previousClosingId: period.previousClosingId,
    since: period.since,
    accounts: period.accounts,
    threshold: organization?.closingDiffThreshold ?? 0,
    canValidate: authorize(ctx.actor, "closing:validate", { branchId: branch.id }).allowed,
    recap: recap
      .map((row) => ({
        operatorName: operatorById.get(row.operatorId)?.name ?? "Opérateur",
        color: operatorById.get(row.operatorId)?.color ?? null,
        count: row._count._all,
        volume: row._sum.amount ?? 0,
        commission: row._sum.commission ?? 0,
      }))
      .sort((a, b) => a.operatorName.localeCompare(b.operatorName, "fr")),
    history: closings.map((closing) => ({
      id: closing.id,
      closedAt: closing.closedAt,
      closedByName: closing.closedBy?.name ?? null,
      status: closing.status,
      totalDifference: closing.lines.reduce((sum, line) => sum + line.difference, 0),
      // Only the latest closing can be reopened: the next opening balances depend on it.
      canReopen: canReopen && closing.status === "CLOSED" && closing.id === period.previousClosingId,
    })),
  }
}
