import type { CommissionMode, RoundingMode, TransactionType } from "@/generated/prisma/enums"
import { DAILY_VOLUME_TYPES, perOperationQuote } from "@/server/commissions/daily"
import { quoteOperation, type Quote, type Rule } from "@/server/commissions/resolve"
import type { Sign, TypeEffect } from "@/server/ledger/effects"
import { transactionPostings, type Posting } from "@/server/ledger/postings"

// Pure: everything an operation will do, computed the same way on the entry screen (instant
// preview, no network) and on the server (the authoritative result that gets written).

export type EntryInput = {
  operatorId: string
  type: TransactionType
  amount: number
  fee: number | null // null = the rule's fee
  commission: number | null // null = the rule's commission; a value needs the manager's permission
  feeInCash: boolean
  manual: { uv: Sign; cash: Sign } | null // OTHER only
}

export type EntrySettings = {
  rules: readonly Rule[]
  roundingMode: RoundingMode
  effect: TypeEffect // effect of this operator and type, already resolved
  allowManualCommission: boolean
  at: Date
  commissionMode: CommissionMode // of this operator: DAILY_VOLUME = commission on the day's total
}

export type EntryAccounts = {
  uvAccountId: string
  cashAccountId: string
  uvBalance: number
  cashBalance: number
}

export type EntryResult = {
  quote: Quote
  fee: number
  feeManual: boolean
  commission: number
  commissionManual: boolean
  postings: Posting[]
  projected: { uv: number; cash: number }
  goesNegative: ("UV" | "CASH")[] // balances this operation would push below zero
}

export function computeEntry(input: EntryInput, settings: EntrySettings, accounts: EntryAccounts): EntryResult {
  const ruled = quoteOperation(
    settings.rules,
    { operatorId: input.operatorId, type: input.type, amount: input.amount, at: settings.at },
    settings.roundingMode,
  )
  const daily = settings.commissionMode === "DAILY_VOLUME"
  const quote = daily ? perOperationQuote(ruled, input.type) : ruled

  const fee = input.fee ?? quote.fee
  // A deposit or withdrawal of a daily-volume operator earns through the day's total only.
  const commissionManual = settings.allowManualCommission && input.commission !== null && !(daily && DAILY_VOLUME_TYPES.includes(input.type))
  const commission = commissionManual ? (input.commission as number) : quote.commission

  const postings = transactionPostings({
    amount: input.amount,
    fee,
    feeInCash: input.feeInCash,
    effect: settings.effect,
    manual: input.manual ?? undefined,
    uvAccountId: accounts.uvAccountId,
    cashAccountId: accounts.cashAccountId,
  })

  const deltaOf = (accountId: string) =>
    postings.filter((posting) => posting.accountId === accountId).reduce((sum, posting) => sum + posting.delta, 0)
  const uvDelta = deltaOf(accounts.uvAccountId)
  const cashDelta = deltaOf(accounts.cashAccountId)
  const projected = { uv: accounts.uvBalance + uvDelta, cash: accounts.cashBalance + cashDelta }

  const goesNegative: EntryResult["goesNegative"] = []
  if (uvDelta < 0 && projected.uv < 0) goesNegative.push("UV")
  if (cashDelta < 0 && projected.cash < 0) goesNegative.push("CASH")

  return {
    quote,
    fee,
    feeManual: fee !== quote.fee,
    commission,
    commissionManual: commissionManual && commission !== quote.commission,
    postings,
    projected,
    goesNegative,
  }
}
