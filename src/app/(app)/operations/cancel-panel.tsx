"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { cancelOperationAction } from "./actions"

type CancelPanelProps = {
  transactionId: string
  onClose: () => void
}

// Reason + confirmation of a cancellation. Shared by the phone cards and the desktop table.
export function CancelPanel({ transactionId, onClose }: CancelPanelProps) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await cancelOperationAction({ transactionId, reason })
      if (result.ok) onClose()
      else setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
      <Label htmlFor={`reason-${transactionId}`}>Motif de l&apos;annulation</Label>
      <Input id={`reason-${transactionId}`} value={reason} onChange={(event) => setReason(event.target.value)}
        placeholder="Ex. : erreur de montant" className="h-12 bg-card text-base" autoFocus />
      <p className="text-xs text-muted-foreground">
        L&apos;opération restera visible, barrée. Ses effets sur les soldes seront annulés.
      </p>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <div className="flex gap-3 lg:max-w-md">
        <Button type="button" variant="destructive" className="h-11 flex-1" disabled={isPending || reason.trim().length < 3} onClick={confirm}>
          {isPending ? "Annulation…" : "Confirmer l'annulation"}
        </Button>
        <Button type="button" variant="outline" className="h-11 flex-1" disabled={isPending} onClick={onClose}>
          Garder
        </Button>
      </div>
    </div>
  )
}
