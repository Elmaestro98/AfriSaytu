"use client"

import { useState, useTransition } from "react"

import { AmountInput } from "@/components/business/amount-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MOVEMENT_HELP, MOVEMENT_KINDS, MOVEMENT_LABELS, type MovementKindKey } from "@/lib/movement-kinds"
import { cn } from "@/lib/utils"
import { newUuid } from "@/lib/uuid"
import { defaultPayoutMonth } from "@/server/cash/payout"
import type { CashAccount } from "@/server/cash/queries"

import { AccountChoice } from "./account-choice"
import { createMovementAction } from "./actions"
import { PayoutFields } from "./payout-fields"

type MovementFormProps = {
  branchId: string
  accounts: readonly CashAccount[]
  initialKind: MovementKindKey
  initialAccountId?: string
  onDone: (message: string, warning: string | null) => void
  onCancel: () => void
}

export function MovementForm({ branchId, accounts, initialKind, initialAccountId, onDone, onCancel }: MovementFormProps) {
  const operators = accounts.filter((account) => account.kind === "OPERATOR")
  const cash = accounts.find((account) => account.kind === "CASH")
  const [kind, setKind] = useState<MovementKindKey>(initialKind)
  const [amount, setAmount] = useState(0)
  const [operatorId, setOperatorId] = useState(initialAccountId ?? operators[0]?.id ?? "")
  const [otherOperatorId, setOtherOperatorId] = useState(operators.find((account) => account.id !== operatorId)?.id ?? "")
  const [payoutAccountId, setPayoutAccountId] = useState(operators[0]?.id ?? cash?.id ?? "")
  const [viaCash, setViaCash] = useState(true) // top-up paid from the drawer / sale paid into it
  const [payoutOperatorId, setPayoutOperatorId] = useState(operators[0]?.operatorId ?? "")
  const [payoutMonth, setPayoutMonth] = useState(() => defaultPayoutMonth(new Date()))
  const [description, setDescription] = useState("")
  const [key] = useState(() => newUuid())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Which account loses and which receives, for each kind. The server checks it again.
  const accountsFor = (): { fromAccountId: string | null; toAccountId: string | null } => {
    const drawer = cash?.id ?? null
    switch (kind) {
      case "UV_TOPUP": return { fromAccountId: viaCash ? drawer : null, toAccountId: operatorId }
      case "UV_SELL": return { fromAccountId: operatorId, toAccountId: viaCash ? drawer : null }
      case "CASH_IN": return { fromAccountId: null, toAccountId: drawer }
      case "CASH_OUT": return { fromAccountId: drawer, toAccountId: null }
      case "TRANSFER": return { fromAccountId: operatorId, toAccountId: otherOperatorId }
      case "COMMISSION_PAYOUT": return { fromAccountId: null, toAccountId: payoutAccountId }
    }
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      // A payout on a UV account comes from that account's operator; in cash, the one chosen.
      const receivedOn = accounts.find((account) => account.id === payoutAccountId)
      const payout = kind === "COMMISSION_PAYOUT"
        ? { operatorId: receivedOn?.operatorId ?? payoutOperatorId, payoutMonth }
        : { operatorId: null, payoutMonth: null }
      const result = await createMovementAction({ idempotencyKey: key, branchId, kind, amount, description, ...accountsFor(), ...payout })
      if (result.ok) onDone(result.message, result.warning)
      else setError(result.error)
    })
  }

  const kinds = MOVEMENT_KINDS.filter((item) => item !== "TRANSFER" || operators.length > 1)

  return (
    <section className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type de mouvement">
        {kinds.map((item) => (
          <button key={item} type="button" role="radio" aria-checked={kind === item} onClick={() => setKind(item)}
            className={cn("min-h-12 rounded-lg border px-2 text-sm font-semibold", kind === item ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {MOVEMENT_LABELS[item]}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{MOVEMENT_HELP[kind]}</p>

      {(kind === "UV_TOPUP" || kind === "UV_SELL" || kind === "TRANSFER") && (
        <AccountChoice label={kind === "UV_TOPUP" ? "Compte à recharger" : "Compte débité"} accounts={operators} value={operatorId} onChange={setOperatorId} />
      )}
      {kind === "TRANSFER" && (
        <AccountChoice label="Compte crédité" accounts={operators.filter((account) => account.id !== operatorId)} value={otherOperatorId} onChange={setOtherOperatorId} />
      )}
      {kind === "COMMISSION_PAYOUT" && (
        <PayoutFields accounts={accounts} payoutAccountId={payoutAccountId} onAccountChange={setPayoutAccountId}
          operatorId={payoutOperatorId} onOperatorChange={setPayoutOperatorId} month={payoutMonth} onMonthChange={setPayoutMonth} />
      )}
      {(kind === "UV_TOPUP" || kind === "UV_SELL") && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5 accent-primary" checked={viaCash} onChange={(event) => setViaCash(event.target.checked)} />
          {kind === "UV_TOPUP" ? "Payé avec les espèces de la caisse" : "Espèces reçues dans la caisse"}
        </label>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="movement-amount">Montant</Label>
        <AmountInput id="movement-amount" value={amount} onValueChange={setAmount} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="movement-description">
          Description <span className="font-normal text-muted-foreground">(facultatif)</span>
        </Label>
        <Input id="movement-description" value={description} onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex. : versement au gérant, reçu VR-882" className="h-12 text-base" />
      </div>

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" className="h-12 flex-[2] text-base font-bold" disabled={isPending || amount <= 0} onClick={submit}>
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="outline" className="h-12 flex-1" disabled={isPending} onClick={onCancel}>Annuler</Button>
      </div>
    </section>
  )
}
