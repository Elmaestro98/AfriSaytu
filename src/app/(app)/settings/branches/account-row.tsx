"use client"

import { useState, useTransition } from "react"

import { AmountInput } from "@/components/business/amount-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { AccountRow as Account } from "@/server/branches/queries"

import { updateAccountAction } from "./actions"

export function AccountRow({ account }: { account: Account }) {
  const [editing, setEditing] = useState(false)
  const [accountNumber, setAccountNumber] = useState(account.accountNumber ?? "")
  const [threshold, setThreshold] = useState(account.alertThreshold ?? 0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const low = account.alertThreshold !== null && account.balance < account.alertThreshold

  const save = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateAccountAction({ accountId: account.id, accountNumber, alertThreshold: threshold })
      if (result.ok) setEditing(false)
      else setError(result.error)
    })
  }

  return (
    <li className={cn("flex flex-col gap-3 py-4", !account.operatorActive && "opacity-60")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full bg-primary"
            style={account.color ? { backgroundColor: account.color } : undefined}
          />
          <span className="truncate font-semibold">{account.label}</span>
          {!account.operatorActive && <span className="text-xs text-muted-foreground">(désactivé)</span>}
        </div>
        {low && (
          <span className="rounded-full bg-brand-accent px-2.5 py-0.5 text-xs font-bold text-brand-accent-foreground">
            Solde bas
          </span>
        )}
      </div>

      <p className="font-heading text-2xl font-bold tabular-nums">{formatFCFA(account.balance)}</p>

      {editing ? (
        <div className="flex flex-col gap-3">
          {account.kind === "OPERATOR" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`number-${account.id}`}>Numéro du compte</Label>
              <Input
                id={`number-${account.id}`}
                inputMode="tel"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                className="h-12 text-base"
              />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`threshold-${account.id}`}>Alerte si le solde passe sous</Label>
            <AmountInput id={`threshold-${account.id}`} value={threshold} onValueChange={setThreshold} />
          </div>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" className="h-11 flex-1" disabled={isPending} onClick={save}>
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="outline" className="h-11 flex-1" disabled={isPending} onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {account.accountNumber ? `N° ${account.accountNumber} · ` : ""}
            Alerte sous {formatFCFA(account.alertThreshold ?? 0)}
          </p>
          <Button type="button" variant="ghost" className="h-11 shrink-0 text-primary" onClick={() => setEditing(true)}>
            Modifier
          </Button>
        </div>
      )}
    </li>
  )
}
