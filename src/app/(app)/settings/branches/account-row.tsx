"use client"

import { Banknote, Pencil } from "lucide-react"
import { useState, useTransition } from "react"

import { AmountInput } from "@/components/business/amount-input"
import { OperatorBadge } from "@/components/business/operator-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { balanceLevel, THRESHOLD_POSITION } from "@/lib/balance-level"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { AccountRow as Account } from "@/server/branches/queries"

import { updateAccountAction } from "./actions"

// One account of a branch: who it is, its theoretical balance against its alert threshold, and
// an inline editor for the account number and the threshold (a balance is never edited here).
export function AccountRow({ account }: { account: Account }) {
  const [editing, setEditing] = useState(false)
  const [accountNumber, setAccountNumber] = useState(account.accountNumber ?? "")
  const [threshold, setThreshold] = useState(account.alertThreshold ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const level = balanceLevel(account.balance, account.alertThreshold)
  const meta = [
    account.kind === "CASH" ? "Espèces" : account.accountNumber ? `N° ${account.accountNumber}` : "Numéro non renseigné",
    level.hasThreshold ? `Alerte sous ${formatFCFA(account.alertThreshold ?? 0)}` : "Sans alerte",
  ]

  const cancel = () => {
    setAccountNumber(account.accountNumber ?? "")
    setThreshold(account.alertThreshold ?? 0)
    setError(null)
    setEditing(false)
  }

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateAccountAction({ accountId: account.id, accountNumber, alertThreshold: threshold })
      if (result.ok) setEditing(false)
      else setError(result.error)
    })
  }

  return (
    <li className={cn("flex flex-col gap-3 py-3", !account.operatorActive && "opacity-60")}>
      <div className="flex items-center gap-3">
        {account.kind === "CASH" ? (
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Banknote className="size-5" />
          </span>
        ) : (
          <OperatorBadge name={account.label} color={account.color} logoSrc={account.logoSrc} className="size-10 text-sm" />
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{account.label}</span>
            {!account.operatorActive && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Désactivé</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{meta.join(" · ")}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className={cn("font-heading text-lg font-extrabold whitespace-nowrap tabular-nums", level.low && "text-brand-accent-strong", account.balance < 0 && "text-destructive")}>
            {formatFCFA(account.balance)}
          </p>
          {level.low && <p className="text-xs font-semibold text-brand-accent-strong">Solde bas</p>}
        </div>

        {!editing && (
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-primary"
            aria-label={`Modifier ${account.label}`} onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {level.hasThreshold && !editing && (
        <div className="relative ml-13 h-1.5 rounded-full bg-muted" aria-hidden>
          <div className={cn("h-1.5 rounded-full", level.low ? "bg-brand-accent" : "bg-primary")} style={{ width: `${level.fill * 100}%` }} />
          <span className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-foreground/40" style={{ left: `${THRESHOLD_POSITION * 100}%` }} />
        </div>
      )}

      {editing && (
        <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
          {account.kind === "OPERATOR" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`number-${account.id}`}>Numéro du compte agent</Label>
              <Input id={`number-${account.id}`} inputMode="tel" value={accountNumber} placeholder="Ex. 77 123 45 67"
                onChange={(event) => setAccountNumber(event.target.value)} className="h-11 bg-card text-base" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`threshold-${account.id}`}>Alerte si le solde passe sous</Label>
            <AmountInput id={`threshold-${account.id}`} value={threshold} onValueChange={setThreshold} className="bg-card" />
            <p className="text-xs text-muted-foreground">0 = pas d&apos;alerte. Le solde lui-même ne se modifie pas ici : il suit les opérations.</p>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button type="button" className="h-11 flex-1" disabled={isPending} onClick={save}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" className="h-11 flex-1 bg-card" disabled={isPending} onClick={cancel}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
