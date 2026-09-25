// Pure: commission reconciliation of a month (F-55), per operator. Estimated = what AfriSaytu
// computed (per-operation commissions + day's commissions); received = the operator's payouts
// recorded for that month. A negative gap means money is missing.

export type ReconciliationRow = { operatorId: string; estimated: number; received: number; gap: number }

export function reconcile(estimated: ReadonlyMap<string, number>, received: ReadonlyMap<string, number>): ReconciliationRow[] {
  const operatorIds = new Set([...estimated.keys(), ...received.keys()])
  return [...operatorIds]
    .map((operatorId) => {
      const expected = estimated.get(operatorId) ?? 0
      const paid = received.get(operatorId) ?? 0
      return { operatorId, estimated: expected, received: paid, gap: paid - expected }
    })
    .filter((row) => row.estimated !== 0 || row.received !== 0)
    .sort((a, b) => a.gap - b.gap) // biggest shortfall first
}
