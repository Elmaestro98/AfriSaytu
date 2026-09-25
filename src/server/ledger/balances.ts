import type { TenantClient } from "@/server/db/tenant"

// A balance is never stored: it is the sum of the ledger lines of the account.
export async function getBalances(
  db: TenantClient,
  accountIds: readonly string[],
): Promise<Map<string, number>> {
  const balances = new Map<string, number>(accountIds.map((id) => [id, 0]))
  if (accountIds.length === 0) return balances

  const sums = await db.ledgerEntry.groupBy({
    by: ["accountId"],
    where: { accountId: { in: [...accountIds] } },
    _sum: { delta: true },
  })
  for (const row of sums) {
    balances.set(row.accountId, row._sum.delta ?? 0)
  }
  return balances
}
