import type { TransactionType } from "@/generated/prisma/enums"
import { dayKey, startOfDakarDay } from "@/lib/dates"
import { DAILY_VOLUME_TYPES, tiersInForce } from "@/server/commissions/daily"
import type { TenantContext } from "@/server/db"
import { getBalances } from "@/server/ledger/balances"
import { formatHour } from "@/server/liquidity/forecast"
import { loadForecasts } from "@/server/liquidity/load"
import { recipients } from "@/server/notifications/kinds"
import { closingGapMessage, liquidityMessage, lowBalanceMessage, tierNearMessage, tierReachedMessage } from "@/server/notifications/messages"
import { isLowBalance, tierEvents } from "@/server/notifications/rules"
import { claimOnce, loadCandidates, pushConfigured, pushToMembers } from "@/server/notifications/send"

// Notifications that follow an action (entry, movement, cancellation, closing). They run after
// the answer is sent (next/server after()), and never throw: a notification must not undo or
// delay the agent's work.

type Ctx = Pick<TenantContext, "db" | "organizationId">

async function safely(label: string, task: () => Promise<void>): Promise<void> {
  if (!pushConfigured()) return
  try {
    await task()
  } catch (error) {
    console.error(`Notification (${label}) failed`, error)
  }
}

// Accounts of the branch now below their alert threshold: once per account and per day.
export function notifyLowBalances(ctx: Ctx, branchId: string, now = new Date()): Promise<void> {
  return safely("low balance", async () => {
    const accounts = await ctx.db.account.findMany({
      where: { branchId, isActive: true, alertThreshold: { not: null } },
      select: { id: true, label: true, alertThreshold: true, branch: { select: { name: true } } },
    })
    if (accounts.length === 0) return
    const balances = await getBalances(ctx.db, accounts.map((account) => account.id))
    const low = accounts.filter((account) => isLowBalance(balances.get(account.id) ?? 0, account.alertThreshold))
    if (low.length === 0) return

    const members = recipients(await loadCandidates(ctx.db), { kind: "LOW_BALANCE", branchId })
    if (members.length === 0) return
    for (const account of low) {
      if (!(await claimOnce(ctx.db, ctx.organizationId, `low-balance:${account.id}:${dayKey(now)}`))) continue
      const balance = balances.get(account.id) ?? 0
      await pushToMembers(ctx.db, members, lowBalanceMessage({ accountId: account.id, accountLabel: account.label, branchName: account.branch.name, balance, threshold: account.alertThreshold ?? 0 }))
    }
  })
}

// Accounts of the branch that run dry in less than 2 hours at the current pace: once per account
// and per day (after an operation or a cancellation, which set the pace).
export function notifyLiquidity(ctx: Ctx, branchId: string, now = new Date()): Promise<void> {
  return safely("liquidity", async () => {
    const accounts = await ctx.db.account.findMany({ where: { branchId, isActive: true }, select: { id: true, label: true, branch: { select: { name: true } } } })
    if (accounts.length === 0) return
    const balances = await getBalances(ctx.db, accounts.map((account) => account.id))
    const forecasts = await loadForecasts(ctx.db, accounts.map((account) => ({ id: account.id, branchId, balance: balances.get(account.id) ?? 0 })), now)
    const soon = accounts.flatMap((account) => {
      const forecast = forecasts.get(account.id)
      return forecast?.status === "soon" ? [{ account, at: forecast.at }] : []
    })
    if (soon.length === 0) return

    const members = recipients(await loadCandidates(ctx.db), { kind: "LIQUIDITY", branchId })
    if (members.length === 0) return
    for (const { account, at } of soon) {
      if (!(await claimOnce(ctx.db, ctx.organizationId, `liquidity:${account.id}:${dayKey(now)}`))) continue
      await pushToMembers(ctx.db, members, liquidityMessage({ accountId: account.id, accountLabel: account.label, branchName: account.branch.name, hour: formatHour(at) }))
    }
  })
}

// A cancellation gives money back to one account and takes it from the other: check its branch.
export function notifyAfterCancel(ctx: Ctx, transactionId: string, now = new Date()): Promise<void> {
  return safely("cancellation", async () => {
    const operation = await ctx.db.transaction.findFirst({ where: { id: transactionId }, select: { branchId: true } })
    if (!operation) return
    await notifyLowBalances(ctx, operation.branchId, now)
    await notifyLiquidity(ctx, operation.branchId, now)
  })
}

// A deposit or withdrawal of a daily-volume operator: next tier in view, or tier reached.
export function notifyDailyTier(ctx: Ctx, operation: { branchId: string; operatorId: string; type: TransactionType; amount: number }, now = new Date()): Promise<void> {
  return safely("daily tier", async () => {
    if (!DAILY_VOLUME_TYPES.includes(operation.type)) return
    const operator = await ctx.db.operatorCatalog.findUnique({ where: { id: operation.operatorId }, select: { name: true, commissionMode: true } })
    if (operator?.commissionMode !== "DAILY_VOLUME") return

    const [today, tiers, branch] = await Promise.all([
      ctx.db.transaction.aggregate({
        where: { branchId: operation.branchId, operatorId: operation.operatorId, status: "VALID", type: { in: [...DAILY_VOLUME_TYPES] }, createdAt: { gte: startOfDakarDay(now), lte: now } },
        _sum: { amount: true },
      }),
      ctx.db.operatorCommissionTier.findMany({ where: { operatorId: operation.operatorId }, select: { minAmount: true, maxAmount: true, commission: true, validFrom: true, validTo: true } }),
      ctx.db.branch.findFirst({ where: { id: operation.branchId }, select: { name: true } }),
    ])
    const after = today._sum.amount ?? 0
    const events = tierEvents(tiersInForce(tiers, now), after - operation.amount, after)
    if (events.length === 0 || !branch) return

    const members = recipients(await loadCandidates(ctx.db), { kind: "DAILY_TIER", branchId: operation.branchId })
    if (members.length === 0) return
    for (const event of events) {
      const key = `tier-${event.kind}:${operation.branchId}:${operation.operatorId}:${dayKey(now)}:${event.number}`
      if (!(await claimOnce(ctx.db, ctx.organizationId, key))) continue
      const common = { operatorName: operator.name, branchName: branch.name, number: event.number, commission: event.commission }
      await pushToMembers(ctx.db, members, event.kind === "reached" ? tierReachedMessage(common) : tierNearMessage({ ...common, missing: event.missing }))
    }
  })
}

// The branch's closing just validated, if it has a gap: to the owner and the managers, not to
// the member who validated it.
export function notifyClosingGap(ctx: Ctx, branchId: string, validatedBy: string): Promise<void> {
  return safely("closing gap", async () => {
    const closing = await ctx.db.dailyClosing.findFirst({
      where: { branchId, status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      select: { id: true, branch: { select: { name: true } }, closedBy: { select: { name: true } }, lines: { select: { difference: true, account: { select: { label: true } } } } },
    })
    if (!closing || closing.lines.every((line) => line.difference === 0)) return

    const members = recipients(await loadCandidates(ctx.db), { kind: "CLOSING_GAP", branchId, exclude: validatedBy })
    if (members.length === 0 || !(await claimOnce(ctx.db, ctx.organizationId, `closing-gap:${closing.id}`))) return
    await pushToMembers(ctx.db, members, closingGapMessage({
      closingId: closing.id,
      branchName: closing.branch.name,
      authorName: closing.closedBy?.name ?? null,
      lines: closing.lines.map((line) => ({ label: line.account.label, difference: line.difference })),
    }))
  })
}
