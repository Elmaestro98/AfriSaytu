import type { LedgerReason, MovementKind, TransactionType } from "@/generated/prisma/enums"
import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { ledgerLabel } from "@/server/cash/ledger-labels"

export const LEDGER_PERIODS = ["today", "7d", "30d", "all"] as const
export type LedgerPeriod = (typeof LEDGER_PERIODS)[number]

export type LedgerLine = {
  id: string
  label: string
  reason: LedgerReason
  transactionType: TransactionType | null
  movementKind: MovementKind | null
  note: string | null // cancellation reason, when the line reverses a cancelled operation
  delta: number
  runningBalance: number // balance of the account right after this line
  authorName: string | null
  createdAt: Date
}

export type AccountLedger = {
  accountId: string
  kind: "OPERATOR" | "CASH"
  label: string
  branchName: string
  balance: number // now, from every line of the account
  openingBalance: number // just before the period shown
  credits: number // sum of the positive lines of the period
  debits: number // sum of the negative lines of the period (negative number)
  lineCount: number // lines of the period
  lines: LedgerLine[] // newest first, at most `limit`
}

// Ledger of one account (F-32): its balance is exactly the sum of its lines. The running balance
// is always computed over every line; the period only narrows what is shown.
// Owner and manager only: the lines show every agent's operations.
export async function getAccountLedger(ctx: ActorContext, accountId: string, since: Date | null, limit = 200): Promise<AccountLedger | null> {
  if (ctx.actor.role === "AGENT") return null

  const account = await ctx.db.account.findFirst({
    where: { id: accountId },
    select: { id: true, kind: true, label: true, branchId: true, branch: { select: { name: true } } },
  })
  if (!account || !authorize(ctx.actor, "transaction:view", { branchId: account.branchId }).allowed) return null

  const entries = await ctx.db.ledgerEntry.findMany({
    where: { accountId: account.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      delta: true,
      reason: true,
      createdAt: true,
      member: { select: { name: true } },
      transaction: { select: { type: true, cancelReason: true, operator: { select: { name: true } } } },
      movement: { select: { kind: true, description: true } },
    },
  })

  let running = 0
  const all: LedgerLine[] = entries.map((entry) => {
    running += entry.delta
    return {
      id: entry.id,
      label: ledgerLabel({
        reason: entry.reason,
        transaction: entry.transaction ? { type: entry.transaction.type, operatorName: entry.transaction.operator.name } : null,
        movement: entry.movement,
      }),
      reason: entry.reason,
      transactionType: entry.transaction?.type ?? null,
      movementKind: entry.movement?.kind ?? null,
      note: entry.reason === "CANCELLATION" ? (entry.transaction?.cancelReason ?? null) : null,
      delta: entry.delta,
      runningBalance: running,
      authorName: entry.member?.name ?? null,
      createdAt: entry.createdAt,
    }
  })

  const shown = since ? all.filter((line) => line.createdAt >= since) : all
  const before = since ? all.filter((line) => line.createdAt < since) : []
  return {
    accountId: account.id,
    kind: account.kind,
    label: account.label,
    branchName: account.branch.name,
    balance: running,
    openingBalance: before.at(-1)?.runningBalance ?? 0,
    credits: shown.reduce((sum, line) => sum + (line.delta > 0 ? line.delta : 0), 0),
    debits: shown.reduce((sum, line) => sum + (line.delta < 0 ? line.delta : 0), 0),
    lineCount: shown.length,
    lines: shown.slice(-limit).reverse(),
  }
}
