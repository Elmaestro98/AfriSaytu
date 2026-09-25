// Percentages are stored in basis points (150 = 1.5 %). Conversion uses digits only: never
// parseFloat, so "0,1" can never become 9.999… basis points.

export const MAX_BASIS_POINTS = 10_000 // 100 %

// "0,5" -> 50, "1.25" -> 125, "2" -> 200. Up to 2 decimals (0.01 % is the smallest step).
// Returns null for an empty field, NaN for anything invalid.
export function parsePercent(input: string): number | null {
  const text = input.replace(/\s|%/g, "")
  if (text === "") return null

  const match = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(text)
  if (!match) return Number.NaN

  const whole = Number(match[1])
  const decimals = Number((match[2] ?? "").padEnd(2, "0"))
  const basisPoints = whole * 100 + decimals
  return basisPoints <= MAX_BASIS_POINTS ? basisPoints : Number.NaN
}

// 50 -> "0,5", 125 -> "1,25", 200 -> "2"
export function formatPercentNumber(basisPoints: number): string {
  const whole = Math.floor(basisPoints / 100)
  const decimals = String(basisPoints % 100).padStart(2, "0").replace(/0+$/, "")
  return decimals ? `${whole},${decimals}` : String(whole)
}

// 50 -> "0,5 %"
export function formatPercent(basisPoints: number): string {
  return `${formatPercentNumber(basisPoints)} %`
}
