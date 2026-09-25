// FCFA has no cents: every amount is an integer. Never use floats or parseFloat on an amount.
// All amount display goes through formatFCFA / formatAmount, never scattered toLocaleString calls.

const NBSP = " "

// 1250000 -> "1 250 000" (non-breaking spaces, so an amount never wraps across lines)
export function formatAmount(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError("Amount must be a safe integer")
  }
  const sign = amount < 0 ? "-" : ""
  const digits = String(Math.abs(amount))
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
}

// 1250000 -> "1 250 000 FCFA"
export function formatFCFA(amount: number): string {
  return `${formatAmount(amount)}${NBSP}FCFA`
}

// Reads what a user typed in an amount field: "1 250 000" -> 1250000.
// Returns null when empty or invalid. Only spaces are accepted as thousands separators: a dot or
// a comma is rejected, so "12.5" can never silently become 125.
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[\s  ]/g, "")
  if (cleaned === "") return null
  if (!/^\d+$/.test(cleaned)) return null

  const value = Number(cleaned)
  return Number.isSafeInteger(value) ? value : null
}
