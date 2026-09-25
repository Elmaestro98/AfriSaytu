// Level gauge of an account against its alert threshold (mockup 04).
// The threshold sits in the middle of the gauge: full gauge = twice the threshold.

export type BalanceLevel = {
  hasThreshold: boolean
  low: boolean // below the alert threshold
  missing: number // how much is needed to reach the threshold (0 when above)
  fill: number // 0 to 1, width of the gauge
}

export const THRESHOLD_POSITION = 0.5

export function balanceLevel(balance: number, threshold: number | null): BalanceLevel {
  if (!threshold || threshold <= 0) return { hasThreshold: false, low: false, missing: 0, fill: 0 }

  const low = balance < threshold
  const fill = Math.min(Math.max(balance / (threshold * 2), 0), 1)
  return { hasThreshold: true, low, missing: low ? threshold - balance : 0, fill }
}
