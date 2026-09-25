import { formatFCFA } from "@/lib/money"
import { formatPercent } from "@/lib/percent"

type RuleAmounts = {
  minAmount: number
  maxAmount: number
  fixedFee: number
  percentage: number
  minCommission: number | null
  cap: number | null
  feeFixed: number
  feePercentage: number
}

// Plain French descriptions of a commission rule, for lists and confirmations.

export function describeRange(rule: Pick<RuleAmounts, "minAmount" | "maxAmount">): string {
  return `De ${formatFCFA(rule.minAmount)} à ${formatFCFA(rule.maxAmount)}`
}

function fixedPlusPercent(fixed: number, percentage: number): string {
  const parts: string[] = []
  if (fixed > 0) parts.push(formatFCFA(fixed))
  if (percentage > 0) parts.push(formatPercent(percentage))
  return parts.length > 0 ? parts.join(" + ") : formatFCFA(0)
}

export function describeCommission(rule: RuleAmounts): string {
  const bounds: string[] = []
  if (rule.minCommission !== null) bounds.push(`min. ${formatFCFA(rule.minCommission)}`)
  if (rule.cap !== null) bounds.push(`plafond ${formatFCFA(rule.cap)}`)
  const base = fixedPlusPercent(rule.fixedFee, rule.percentage)
  return bounds.length > 0 ? `${base} (${bounds.join(", ")})` : base
}

export function describeFee(rule: RuleAmounts): string {
  return rule.feeFixed === 0 && rule.feePercentage === 0
    ? "Aucun"
    : fixedPlusPercent(rule.feeFixed, rule.feePercentage)
}
