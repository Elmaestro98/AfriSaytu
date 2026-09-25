import type { RoundingMode, TransactionType } from "@/generated/prisma/enums"
import { computeCommission, computeFee, type RuleAmounts } from "@/server/commissions/compute"

// Which rule applies to an operation, and whether a new rule would overlap an existing one.
// Pure: the rules are loaded by the caller.

export type Rule = RuleAmounts & {
  id: string
  operatorId: string
  type: TransactionType
  minAmount: number
  maxAmount: number
  validFrom: Date
  validTo: Date | null // exclusive end; null = still in force
  isActive: boolean
}

export type OperationKey = {
  operatorId: string
  type: TransactionType
  amount: number
  at: Date
}

function inForce(rule: Rule, at: Date): boolean {
  return rule.validFrom <= at && (rule.validTo === null || at < rule.validTo)
}

export function findRule(rules: readonly Rule[], key: OperationKey): Rule | null {
  const matches = rules.filter(
    (rule) =>
      rule.isActive &&
      rule.operatorId === key.operatorId &&
      rule.type === key.type &&
      rule.minAmount <= key.amount &&
      key.amount <= rule.maxAmount &&
      inForce(rule, key.at),
  )
  // Overlaps are refused when saving, so there is at most one. Keep the newest to be safe.
  matches.sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())
  return matches[0] ?? null
}

export type Quote = {
  commissionRuleId: string | null
  commission: number
  fee: number
  noRule: boolean // no rule found: commission 0, flagged for the manager
}

export function quoteOperation(rules: readonly Rule[], key: OperationKey, mode: RoundingMode): Quote {
  const rule = findRule(rules, key)
  if (!rule) return { commissionRuleId: null, commission: 0, fee: 0, noRule: true }
  return {
    commissionRuleId: rule.id,
    commission: computeCommission(key.amount, rule, mode),
    fee: computeFee(key.amount, rule, mode),
    noRule: false,
  }
}

type RuleWindow = Pick<Rule, "operatorId" | "type" | "minAmount" | "maxAmount" | "validFrom" | "validTo" | "isActive">

function periodsOverlap(a: RuleWindow, b: RuleWindow): boolean {
  const aEnds = a.validTo?.getTime() ?? Number.POSITIVE_INFINITY
  const bEnds = b.validTo?.getTime() ?? Number.POSITIVE_INFINITY
  return a.validFrom.getTime() < bEnds && b.validFrom.getTime() < aEnds
}

// Ranges of the same operator/type must not overlap (blocking check when saving a rule).
// Ranges are inclusive: [1 000 ; 50 000] and [50 000 ; 500 000] overlap on 50 000.
export function findOverlap<T extends RuleWindow>(candidate: RuleWindow, existing: readonly T[]): T | null {
  return (
    existing.find(
      (rule) =>
        rule.isActive &&
        rule.operatorId === candidate.operatorId &&
        rule.type === candidate.type &&
        rule.minAmount <= candidate.maxAmount &&
        candidate.minAmount <= rule.maxAmount &&
        periodsOverlap(rule, candidate),
    ) ?? null
  )
}
