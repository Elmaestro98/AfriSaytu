import type { RoundingMode } from "@/generated/prisma/enums"

// Commission and customer fee of an operation, in whole FCFA. Integer arithmetic only:
// never a float, never parseFloat. Percentages are basis points (150 = 1.5 %).

export const BASIS_POINTS = 10_000

export type RuleAmounts = {
  fixedFee: number // fixed part of the agent commission
  percentage: number // basis points
  minCommission: number | null
  cap: number | null
  feeFixed: number // fixed part of the customer fee
  feePercentage: number // basis points
}

// numerator / denominator rounded with the organization's rule, exact on integers.
export function divideRounded(numerator: number, denominator: number, mode: RoundingMode): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || numerator < 0 || denominator <= 0) {
    throw new RangeError("divideRounded expects a non-negative safe integer over a positive safe integer")
  }
  let quotient = Math.floor(numerator / denominator)
  let remainder = numerator - quotient * denominator
  // Correct a possible off-by-one of the floating division.
  if (remainder < 0) {
    quotient -= 1
    remainder += denominator
  } else if (remainder >= denominator) {
    quotient += 1
    remainder -= denominator
  }

  switch (mode) {
    case "FLOOR":
      return quotient
    case "CEIL":
      return remainder > 0 ? quotient + 1 : quotient
    case "NEAREST":
      return remainder * 2 >= denominator ? quotient + 1 : quotient // half up
  }
}

function percentOf(amount: number, basisPoints: number, mode: RoundingMode): number {
  const product = amount * basisPoints
  if (!Number.isSafeInteger(product)) throw new RangeError("Amount too large")
  return divideRounded(product, BASIS_POINTS, mode)
}

// commission = fixedFee + amount × percentage, then at least minCommission, at most cap.
// Min and cap are whole numbers, so rounding the percentage part first gives the same result
// as rounding at the end, while keeping every step in integers.
export function computeCommission(amount: number, rule: RuleAmounts, mode: RoundingMode): number {
  let commission = rule.fixedFee + percentOf(amount, rule.percentage, mode)
  if (rule.minCommission !== null) commission = Math.max(commission, rule.minCommission)
  if (rule.cap !== null) commission = Math.min(commission, rule.cap)
  return commission
}

export function computeFee(amount: number, rule: RuleAmounts, mode: RoundingMode): number {
  return rule.feeFixed + percentOf(amount, rule.feePercentage, mode)
}
