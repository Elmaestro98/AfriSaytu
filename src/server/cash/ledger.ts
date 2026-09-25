import type { ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { ledgerLabel } from "@/server/cash/ledger-labels"

export type LedgerLine = {
  id: string
  label: string
  delta: number
  runningBalance: number // balance of the account right after this line
  authorName: string | null
  createdAt: Date
}

export type AccountLedger = {
  accountId: string
  label: string
  branchName: string
  balance: number
  lineCount: number
  lines: LedgerLine[] // newest first, at most `limit`
}

// Ledger of one account (F-32): its balance is exactly the sum of its lines.
// Owner and manager only: the lines show every agent's operations.
export async function getAccountLedger(ctx: ActorContext, accountId: string, limit = 100): Promise<AccountLedger | null> {
  if (ctx.actor.role === "AGENT") return null

  const account = await ctx.db.account.findFirst({
    where: { id: accountId },
    select: { id: true, label: true, branchId: true, branch: { select: { name: true } } },
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
      transaction: { select: { type: true, operator: { select: { name: true } } } },
      movement: { select: { kind: true, description: true } },
    },
  })

  let running = 0
  const lines: LedgerLine[] = entries.map((entry) => {
    running += entry.delta
    return {
      id: entry.id,
      label: ledgerLabel({
        reason: entry.reason,
        transaction: entry.transaction ? { type: entry.transaction.type, operatorName: entry.transaction.operator.name } : null,
        movement: entry.movement,
      }),
      delta: entry.delta,
      runningBalance: running,
      authorName: entry.member?.name ?? null,
      createdAt: entry.createdAt,
    }
  })

  return {
    accountId: account.id,
    label: account.label,
    branchName: account.branch.name,
    balance: running,
    lineCount: lines.length,
    lines: lines.slice(-limit).reverse(),
  }
}
