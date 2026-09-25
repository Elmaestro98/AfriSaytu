"use client"

import { Plus } from "lucide-react"
import { useState, useTransition } from "react"

import { AmountInput } from "@/components/business/amount-input"
import { OperatorTile } from "@/components/business/operator-tile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { BranchRow } from "@/server/branches/queries"

import { addOperatorAccountAction } from "./actions"

type AddOperatorFormProps = {
  branchId: string
  operators: BranchRow["addableOperators"]
}

export function AddOperatorForm({ branchId, operators }: AddOperatorFormProps) {
  const [open, setOpen] = useState(false)
  const [operatorId, setOperatorId] = useState(operators[0]?.id ?? "")
  const [accountNumber, setAccountNumber] = useState("")
  const [openingBalance, setOpeningBalance] = useState(0)
  const [alertThreshold, setAlertThreshold] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (operators.length === 0) return null

  if (!open) {
    return (
      <Button type="button" variant="outline" className="h-12 w-full border-dashed text-base" onClick={() => setOpen(true)}>
        <Plus className="size-5" aria-hidden />
        Ajouter un opérateur
      </Button>
    )
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await addOperatorAccountAction({ branchId, operatorId, accountNumber, openingBalance, alertThreshold })
      if (result.ok) setOpen(false)
      else setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-muted p-4">
      <p className="font-semibold">Ajouter un opérateur</p>
      <div className="grid grid-cols-2 gap-3">
        {operators.map((operator) => (
          <OperatorTile
            key={operator.id}
            name={operator.name}
            color={operator.color}
            selected={operatorId === operator.id}
            onToggle={() => setOperatorId(operator.id)}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`add-number-${branchId}`}>
          Numéro du compte <span className="font-normal text-muted-foreground">(facultatif)</span>
        </Label>
        <Input
          id={`add-number-${branchId}`}
          inputMode="tel"
          value={accountNumber}
          onChange={(event) => setAccountNumber(event.target.value)}
          className="h-12 bg-card text-base"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`add-opening-${branchId}`}>Solde actuel (unités électroniques)</Label>
        <AmountInput id={`add-opening-${branchId}`} value={openingBalance} onValueChange={setOpeningBalance} className="bg-card" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`add-threshold-${branchId}`}>Alerte si le solde passe sous</Label>
        <AmountInput id={`add-threshold-${branchId}`} value={alertThreshold} onValueChange={setAlertThreshold} className="bg-card" />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="button" className="h-12 flex-1" disabled={isPending || !operatorId} onClick={submit}>
          {isPending ? "Ajout…" : "Ajouter"}
        </Button>
        <Button type="button" variant="outline" className="h-12 flex-1" disabled={isPending} onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
