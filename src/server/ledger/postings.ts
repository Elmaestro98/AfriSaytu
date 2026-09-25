import type { MovementKind } from "@/generated/prisma/enums"
import type { Sign, TypeEffect } from "@/server/ledger/effects"

// Pure: the ledger lines (account + signed delta) produced by an operation, a movement or a
// cancellation. Zero lines are never written.

export type Posting = { accountId: string; delta: number }

export class PostingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PostingError"
  }
}

function assertAmount(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new PostingError(`${name} must be a non-negative integer`)
}

function withoutZero(postings: Posting[]): Posting[] {
  return postings.filter((posting) => posting.delta !== 0)
}

export type TransactionPostingInput = {
  amount: number
  fee: number
  feeInCash: boolean
  effect: TypeEffect
  manual?: { uv: Sign; cash: Sign } // OTHER only: directions chosen by the agent
  uvAccountId: string
  cashAccountId: string
}

export function transactionPostings(input: TransactionPostingInput): Posting[] {
  assertAmount(input.amount, "amount")
  assertAmount(input.fee, "fee")
  if (input.amount === 0) throw new PostingError("amount must be positive")

  if (input.effect.manual) {
    if (!input.manual) throw new PostingError("OTHER needs a manual choice of directions")
    return withoutZero([
      { accountId: input.uvAccountId, delta: input.manual.uv * input.amount },
      { accountId: input.cashAccountId, delta: input.manual.cash * input.amount },
    ])
  }

  const { uv, cash } = input.effect
  const cashFee = input.feeInCash ? cash.fee * input.fee : 0
  return withoutZero([
    { accountId: input.uvAccountId, delta: uv.amount * input.amount + uv.fee * input.fee },
    { accountId: input.cashAccountId, delta: cash.amount * input.amount + cashFee },
  ])
}

export type MovementAccount = { id: string; kind: "OPERATOR" | "CASH" }

export type MovementPostingInput = {
  kind: MovementKind
  amount: number
  from?: MovementAccount // account that loses the amount
  to?: MovementAccount // account that receives it
}

// Internal movements (cahier 6.2). A missing "from" on a top-up means the UV was paid from
// outside the drawer (e.g. by the manager); same for a missing "to" on a UV sale.
export function movementPostings({ kind, amount, from, to }: MovementPostingInput): Posting[] {
  assertAmount(amount, "amount")
  if (amount === 0) throw new PostingError("amount must be positive")
  if (from && to && from.id === to.id) throw new PostingError("from and to must be different accounts")

  const need = (account: MovementAccount | undefined, kinds: MovementAccount["kind"][], role: string) => {
    if (!account) throw new PostingError(`${kind} needs a "${role}" account`)
    if (!kinds.includes(account.kind)) throw new PostingError(`${kind}: wrong "${role}" account kind`)
    return account
  }
  const forbid = (account: MovementAccount | undefined, role: string) => {
    if (account) throw new PostingError(`${kind} takes no "${role}" account`)
  }
  const optional = (account: MovementAccount | undefined, kinds: MovementAccount["kind"][], role: string) =>
    account ? need(account, kinds, role) : undefined

  const lines: (Posting | null)[] = []
  const debit = (account?: MovementAccount) => lines.push(account ? { accountId: account.id, delta: -amount } : null)
  const credit = (account?: MovementAccount) => lines.push(account ? { accountId: account.id, delta: amount } : null)

  switch (kind) {
    case "UV_TOPUP":
      credit(need(to, ["OPERATOR"], "to"))
      debit(optional(from, ["CASH"], "from"))
      break
    case "UV_SELL":
      debit(need(from, ["OPERATOR"], "from"))
      credit(optional(to, ["CASH"], "to"))
      break
    case "CASH_IN":
      forbid(from, "from")
      credit(need(to, ["CASH"], "to"))
      break
    case "CASH_OUT":
      forbid(to, "to")
      debit(need(from, ["CASH"], "from"))
      break
    case "TRANSFER":
      debit(need(from, ["OPERATOR"], "from"))
      credit(need(to, ["OPERATOR"], "to"))
      break
    case "COMMISSION_PAYOUT":
      // Commission actually received from the operator, on the account where it arrived.
      forbid(from, "from")
      credit(need(to, ["OPERATOR", "CASH"], "to"))
      break
  }
  return lines.filter((line): line is Posting => line !== null)
}

// Cancellation: one counter-entry per original line, so the sum returns to its previous value.
export function reversalPostings<T extends Posting & { id: string }>(
  entries: readonly T[],
): (Posting & { reversalOfId: string })[] {
  return entries.map((entry) => ({ accountId: entry.accountId, delta: -entry.delta, reversalOfId: entry.id }))
}
