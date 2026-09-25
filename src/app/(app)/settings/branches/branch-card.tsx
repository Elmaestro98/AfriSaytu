import { MapPin, Store } from "lucide-react"

import { balanceLevel } from "@/lib/balance-level"
import { formatAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { BranchRow } from "@/server/branches/queries"

import { AccountRow } from "./account-row"
import { AddOperatorForm } from "./add-operator-form"

// Display totals of a branch (sums of the theoretical balances shown below, nothing more).
export function branchTotals(branch: BranchRow) {
  const sum = (kind: "OPERATOR" | "CASH") => branch.accounts.filter((account) => account.kind === kind).reduce((total, account) => total + account.balance, 0)
  const uv = sum("OPERATOR")
  const cash = sum("CASH")
  const low = branch.accounts.filter((account) => balanceLevel(account.balance, account.alertThreshold).low).length
  return { uv, cash, total: uv + cash, low }
}

function Figure({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-2.5 first:pl-0 last:pr-0">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn("truncate font-heading font-bold tabular-nums", strong ? "text-lg text-primary" : "text-base")}>{formatFCFA(value)}</p>
    </div>
  )
}

export function BranchCard({ branch }: { branch: BranchRow }) {
  const totals = branchTotals(branch)
  const operators = branch.accounts.filter((account) => account.kind === "OPERATOR").length

  return (
    <section aria-labelledby={`branch-${branch.id}`} className="flex flex-col rounded-2xl border bg-card shadow-xs">
      <header className="flex items-start gap-3 border-b p-4">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Store className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`branch-${branch.id}`} className="truncate font-heading text-xl font-bold">{branch.name}</h2>
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            {branch.address ? (
              <>
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{branch.address}</span>
              </>
            ) : (
              `${formatAmount(operators)} opérateur${operators > 1 ? "s" : ""} · 1 caisse`
            )}
          </p>
        </div>
        {totals.low > 0 && (
          <span className="shrink-0 rounded-full bg-brand-accent px-2.5 py-1 text-xs font-bold text-brand-accent-foreground">
            {totals.low} solde{totals.low > 1 ? "s" : ""} bas
          </span>
        )}
      </header>

      <div className="grid grid-cols-3 divide-x border-b px-4">
        <Figure label="UV" value={totals.uv} />
        <Figure label="Espèces" value={totals.cash} />
        <Figure label="Total" value={totals.total} strong />
      </div>

      <div className="flex flex-col px-4 pt-3 pb-4">
        <p className="text-xs text-muted-foreground">
          Soldes théoriques, calculés à partir des opérations. Le solde réel se constate à la clôture.
        </p>
        <ul className="divide-y">
          {branch.accounts.map((account) => <AccountRow key={account.id} account={account} />)}
        </ul>
        <AddOperatorForm branchId={branch.id} operators={branch.addableOperators} />
      </div>
    </section>
  )
}
