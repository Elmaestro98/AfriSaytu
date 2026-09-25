import { describe, expect, it } from "vitest"

import { DEFAULT_EFFECTS, resolveEffects } from "@/server/ledger/effects"
import {
  PostingError,
  movementPostings,
  reversalPostings,
  transactionPostings,
  type Posting,
} from "@/server/ledger/postings"

const UV = "uv"
const CASH = "cash"
const uvAccount = { id: UV, kind: "OPERATOR" as const }
const cashAccount = { id: CASH, kind: "CASH" as const }

function post(type: keyof typeof DEFAULT_EFFECTS, amount: number, fee = 0, feeInCash = false) {
  return transactionPostings({
    amount,
    fee,
    feeInCash,
    effect: DEFAULT_EFFECTS[type],
    uvAccountId: UV,
    cashAccountId: CASH,
  })
}

const deltaOf = (postings: Posting[], accountId: string) =>
  postings.filter((posting) => posting.accountId === accountId).reduce((sum, posting) => sum + posting.delta, 0)

describe("matrix 6.1, one test per type", () => {
  it("DEPOSIT: UV - amount, cash + amount (+ fee only if paid in cash)", () => {
    expect(post("DEPOSIT", 100_000)).toEqual([{ accountId: UV, delta: -100_000 }, { accountId: CASH, delta: 100_000 }])
    expect(deltaOf(post("DEPOSIT", 100_000, 500, true), CASH)).toBe(100_500)
    expect(deltaOf(post("DEPOSIT", 100_000, 500, false), CASH)).toBe(100_000)
  })

  it("WITHDRAWAL: UV + amount, cash - amount", () => {
    expect(post("WITHDRAWAL", 150_000)).toEqual([{ accountId: UV, delta: 150_000 }, { accountId: CASH, delta: -150_000 }])
  })

  it("SEND: UV - (amount + fee) by default, cash + amount + fee", () => {
    const lines = post("SEND", 50_000, 500, true)
    expect(deltaOf(lines, UV)).toBe(-50_500)
    expect(deltaOf(lines, CASH)).toBe(50_500)
  })

  it("SEND with the fee not taken from the UV", () => {
    const effect = resolveEffects({ SEND: { uv: { fee: 0 } } }).SEND
    const lines = transactionPostings({ amount: 50_000, fee: 500, feeInCash: true, effect, uvAccountId: UV, cashAccountId: CASH })
    expect(deltaOf(lines, UV)).toBe(-50_000)
    expect(deltaOf(lines, CASH)).toBe(50_500)
  })

  it("AIRTIME: UV - amount, cash + amount", () => {
    expect(post("AIRTIME", 2_000)).toEqual([{ accountId: UV, delta: -2_000 }, { accountId: CASH, delta: 2_000 }])
  })

  it("BILL: UV - amount, cash + amount + fee", () => {
    const lines = post("BILL", 30_000, 300, true)
    expect(deltaOf(lines, UV)).toBe(-30_000)
    expect(deltaOf(lines, CASH)).toBe(30_300)
  })

  it("OTHER: directions chosen by hand, and refused without a choice", () => {
    const base = { amount: 5_000, fee: 0, feeInCash: false, effect: DEFAULT_EFFECTS.OTHER, uvAccountId: UV, cashAccountId: CASH }
    expect(transactionPostings({ ...base, manual: { uv: 1, cash: 0 } })).toEqual([{ accountId: UV, delta: 5_000 }])
    expect(() => transactionPostings(base)).toThrow(PostingError)
  })

  it("never writes a zero line and refuses bad amounts", () => {
    expect(post("WITHDRAWAL", 1_000, 999).every((line) => line.delta !== 0)).toBe(true)
    expect(() => post("DEPOSIT", 0)).toThrow(PostingError)
    expect(() => post("DEPOSIT", 10.5)).toThrow(PostingError)
    expect(() => post("DEPOSIT", 1_000, -5)).toThrow(PostingError)
  })
})

describe("internal movements (6.2)", () => {
  it("UV top-up paid from the drawer, or from outside", () => {
    expect(movementPostings({ kind: "UV_TOPUP", amount: 200_000, from: cashAccount, to: uvAccount })).toEqual([
      { accountId: UV, delta: 200_000 },
      { accountId: CASH, delta: -200_000 },
    ])
    expect(movementPostings({ kind: "UV_TOPUP", amount: 200_000, to: uvAccount })).toEqual([{ accountId: UV, delta: 200_000 }])
  })

  it("UV sale, cash in, cash out", () => {
    expect(deltaOf(movementPostings({ kind: "UV_SELL", amount: 100, from: uvAccount, to: cashAccount }), CASH)).toBe(100)
    expect(movementPostings({ kind: "CASH_IN", amount: 450_000, to: cashAccount })).toEqual([{ accountId: CASH, delta: 450_000 }])
    expect(movementPostings({ kind: "CASH_OUT", amount: 300_000, from: cashAccount })).toEqual([{ accountId: CASH, delta: -300_000 }])
  })

  it("transfer between two operators", () => {
    const other = { id: "uv2", kind: "OPERATOR" as const }
    expect(movementPostings({ kind: "TRANSFER", amount: 10_000, from: uvAccount, to: other })).toEqual([
      { accountId: UV, delta: -10_000 },
      { accountId: "uv2", delta: 10_000 },
    ])
  })

  it("commission payout credits the receiving account", () => {
    expect(movementPostings({ kind: "COMMISSION_PAYOUT", amount: 18_500, to: uvAccount })).toEqual([{ accountId: UV, delta: 18_500 }])
  })

  it("refuses wrong or missing accounts", () => {
    expect(() => movementPostings({ kind: "UV_TOPUP", amount: 1, to: cashAccount })).toThrow(PostingError)
    expect(() => movementPostings({ kind: "CASH_IN", amount: 1, to: uvAccount })).toThrow(PostingError)
    expect(() => movementPostings({ kind: "CASH_IN", amount: 1, from: cashAccount, to: cashAccount })).toThrow(PostingError)
    expect(() => movementPostings({ kind: "TRANSFER", amount: 1, from: uvAccount, to: uvAccount })).toThrow(PostingError)
    expect(() => movementPostings({ kind: "CASH_OUT", amount: 0, from: cashAccount })).toThrow(PostingError)
  })
})

describe("ledger invariant", () => {
  it("replays Annexe B.2 and cancellations bring balances back", () => {
    const ledger: (Posting & { id: string })[] = []
    let next = 0
    const write = (lines: Posting[]) => {
      const written = lines.map((line) => ({ ...line, id: `e${++next}` }))
      ledger.push(...written)
      return written
    }
    const balance = (accountId: string) => deltaOf(ledger, accountId)

    write([{ accountId: UV, delta: 500_000 }, { accountId: CASH, delta: 300_000 }]) // opening
    write(post("DEPOSIT", 100_000))
    expect([balance(UV), balance(CASH)]).toEqual([400_000, 400_000])
    write(post("WITHDRAWAL", 150_000))
    expect([balance(UV), balance(CASH)]).toEqual([550_000, 250_000])
    write(movementPostings({ kind: "UV_TOPUP", amount: 200_000, from: cashAccount, to: uvAccount }))
    expect([balance(UV), balance(CASH)]).toEqual([750_000, 50_000])

    // A mistaken operation, then its cancellation: balances return exactly.
    const mistake = write(post("SEND", 80_000, 800, true))
    write(reversalPostings(mistake))
    expect([balance(UV), balance(CASH)]).toEqual([750_000, 50_000])
  })
})
