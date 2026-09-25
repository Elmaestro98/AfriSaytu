// Counting the cash drawer by banknotes and coins (FCFA, BCEAO). Whole numbers only.

export type Denomination = { key: string; value: number; label: string; kind: "BILLET" | "PIECE" }

export const DENOMINATIONS: readonly Denomination[] = [
  { key: "B10000", value: 10_000, label: "10 000 F", kind: "BILLET" },
  { key: "B5000", value: 5_000, label: "5 000 F", kind: "BILLET" },
  { key: "B2000", value: 2_000, label: "2 000 F", kind: "BILLET" },
  { key: "B1000", value: 1_000, label: "1 000 F", kind: "BILLET" },
  { key: "B500", value: 500, label: "500 F", kind: "BILLET" },
  { key: "P500", value: 500, label: "500 F", kind: "PIECE" },
  { key: "P250", value: 250, label: "250 F", kind: "PIECE" },
  { key: "P200", value: 200, label: "200 F", kind: "PIECE" },
  { key: "P100", value: 100, label: "100 F", kind: "PIECE" },
  { key: "P50", value: 50, label: "50 F", kind: "PIECE" },
  { key: "P25", value: 25, label: "25 F", kind: "PIECE" },
  { key: "P10", value: 10, label: "10 F", kind: "PIECE" },
  { key: "P5", value: 5, label: "5 F", kind: "PIECE" },
]

export const MAX_PIECES = 100_000

export type CashCount = Record<string, number>

// Keeps only known denominations with a valid, positive quantity.
export function cleanCashCount(count: CashCount): CashCount {
  const clean: CashCount = {}
  for (const { key } of DENOMINATIONS) {
    const quantity = count[key]
    if (Number.isSafeInteger(quantity) && quantity > 0 && quantity <= MAX_PIECES) clean[key] = quantity
  }
  return clean
}

export function cashCountTotal(count: CashCount): number {
  const clean = cleanCashCount(count)
  return DENOMINATIONS.reduce((sum, { key, value }) => sum + value * (clean[key] ?? 0), 0)
}
