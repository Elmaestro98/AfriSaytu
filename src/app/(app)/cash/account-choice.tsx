"use client"

import { cn } from "@/lib/utils"
import type { CashAccount } from "@/server/cash/queries"

// Choice of one account of the branch, as big tappable buttons.
export function AccountChoice({ label, accounts, value, onChange }: { label: string; accounts: readonly CashAccount[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={label}>
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {accounts.map((account) => (
          <button key={account.id} type="button" role="radio" aria-checked={value === account.id} onClick={() => onChange(account.id)}
            className={cn("flex h-12 items-center justify-center gap-2 rounded-lg border-2 px-2 text-sm font-semibold", value === account.id ? "border-primary bg-accent" : "border-border bg-card")}>
            <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-primary" style={account.color ? { backgroundColor: account.color } : undefined} />
            <span className="truncate">{account.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
