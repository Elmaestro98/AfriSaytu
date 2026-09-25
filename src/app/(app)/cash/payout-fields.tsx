"use client"

import { formatMonth, monthKey, shiftMonth } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { CashAccount } from "@/server/cash/queries"

import { AccountChoice } from "./account-choice"

const MONTHS_BACK = 12

type PayoutFieldsProps = {
  accounts: readonly CashAccount[]
  payoutAccountId: string
  onAccountChange: (id: string) => void
  operatorId: string
  onOperatorChange: (id: string) => void
  month: string
  onMonthChange: (month: string) => void
}

// Commission payout (F-55): where it was received, who paid (deduced from a UV account, chosen
// for cash) and the month it covers (the previous month by default: operators pay monthly).
export function PayoutFields({ accounts, payoutAccountId, onAccountChange, operatorId, onOperatorChange, month, onMonthChange }: PayoutFieldsProps) {
  const operatorAccounts = accounts.filter((account) => account.kind === "OPERATOR" && account.operatorId)
  const receivedOn = accounts.find((account) => account.id === payoutAccountId)
  const current = monthKey(new Date())
  const months = Array.from({ length: MONTHS_BACK + 1 }, (_, index) => shiftMonth(current, -index))

  return (
    <div className="flex flex-col gap-4">
      <AccountChoice label="Reçue sur" accounts={accounts} value={payoutAccountId} onChange={onAccountChange} />

      {receivedOn?.kind === "OPERATOR" ? (
        <p className="text-sm text-muted-foreground">Versement de <span className="font-semibold text-foreground">{receivedOn.label}</span>.</p>
      ) : (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Opérateur qui verse">
          <p className="text-sm font-medium">Opérateur qui verse</p>
          <div className="grid grid-cols-2 gap-2">
            {operatorAccounts.map((account) => (
              <button key={account.id} type="button" role="radio" aria-checked={operatorId === account.operatorId}
                onClick={() => onOperatorChange(account.operatorId ?? "")}
                className={cn("h-12 rounded-lg border-2 px-2 text-sm font-semibold", operatorId === account.operatorId ? "border-primary bg-accent" : "border-border bg-card")}>
                {account.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-2 text-sm font-medium">
        Commission du mois de
        <select value={month} onChange={(event) => onMonthChange(event.target.value)} className="h-12 rounded-lg border bg-card px-3 text-base capitalize">
          {months.map((key) => <option key={key} value={key}>{formatMonth(key)}</option>)}
        </select>
      </label>
    </div>
  )
}
