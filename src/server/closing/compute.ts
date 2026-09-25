// Pure: turns the counted balances into closing lines (cahier 6 "Clôture", F-41 to F-43).
// difference = counted - theoretical. Positive = surplus, negative = shortage.

export type ClosingAccount = {
  id: string
  label: string
  opening: number // balance at the start of the period (after the previous closing)
  theoretical: number // ledger balance now
}

export type CountedInput = {
  accountId: string
  counted: number
  justification: string | null
}

export type ComputedLine = {
  accountId: string
  openingBalance: number
  theoreticalBalance: number
  countedBalance: number
  difference: number
  justification: string | null
}

export type ClosingPlan =
  | { ok: true; lines: ComputedLine[]; totalDifference: number }
  | { ok: false; error: string; accountId?: string }

// A justification is required beyond the threshold ("au-delà du seuil").
// Threshold 0 = any non-zero difference.
export function needsJustification(difference: number, threshold: number): boolean {
  return Math.abs(difference) > Math.max(0, threshold)
}

export function planClosing(accounts: readonly ClosingAccount[], counted: readonly CountedInput[], threshold: number): ClosingPlan {
  const byAccount = new Map(counted.map((line) => [line.accountId, line]))
  if (byAccount.size !== counted.length) return { ok: false, error: "Un compte est saisi deux fois." }

  const lines: ComputedLine[] = []
  for (const account of accounts) {
    const input = byAccount.get(account.id)
    if (!input) return { ok: false, error: `Saisissez le solde constaté de ${account.label}.`, accountId: account.id }
    if (!Number.isSafeInteger(input.counted) || input.counted < 0) {
      return { ok: false, error: `Solde constaté invalide pour ${account.label}.`, accountId: account.id }
    }

    const difference = input.counted - account.theoretical
    const justification = input.justification?.trim() || null
    if (needsJustification(difference, threshold) && !justification) {
      return { ok: false, error: `Expliquez l'écart de ${account.label}.`, accountId: account.id }
    }

    lines.push({
      accountId: account.id,
      openingBalance: account.opening,
      theoreticalBalance: account.theoretical,
      countedBalance: input.counted,
      difference,
      justification,
    })
  }

  const unknown = counted.find((line) => !accounts.some((account) => account.id === line.accountId))
  if (unknown) return { ok: false, error: "Un compte saisi n'appartient pas à ce point de vente." }

  return { ok: true, lines, totalDifference: lines.reduce((sum, line) => sum + line.difference, 0) }
}
