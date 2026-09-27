import type { TenantClient } from "@/server/db/tenant"
import { forecastAccount, WINDOW_MINUTES, type Forecast } from "@/server/liquidity/forecast"

type Db = Pick<TenantClient, "branch" | "ledgerEntry">

// Forecasts of several accounts whose balances are already known (one query for the pace).
export async function loadForecasts(
  db: Db,
  accounts: readonly { id: string; branchId: string; balance: number }[],
  now = new Date(),
): Promise<Map<string, Forecast>> {
  const forecasts = new Map<string, Forecast>()
  if (accounts.length === 0) return forecasts

  const [branches, lines] = await Promise.all([
    db.branch.findMany({ where: { id: { in: [...new Set(accounts.map((account) => account.branchId))] } }, select: { id: true, closesAt: true } }),
    db.ledgerEntry.findMany({
      where: {
        accountId: { in: accounts.map((account) => account.id) },
        // Customer operations and their cancellations set the pace; nothing else does.
        reason: { in: ["TRANSACTION", "CANCELLATION"] },
        createdAt: { gte: new Date(now.getTime() - WINDOW_MINUTES * 60_000), lte: now },
      },
      select: { id: true, accountId: true, delta: true, createdAt: true, transactionId: true },
    }),
  ])
  const closesAt = new Map(branches.map((branch) => [branch.id, branch.closesAt]))

  for (const account of accounts) {
    const flows = lines
      .filter((line) => line.accountId === account.id)
      .map((line) => ({ at: line.createdAt, delta: line.delta, operationId: line.transactionId ?? line.id }))
    forecasts.set(account.id, forecastAccount({ balance: account.balance, flows, now, closesAt: closesAt.get(account.branchId) ?? 21 * 60 }))
  }
  return forecasts
}
