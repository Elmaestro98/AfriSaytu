"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import { cn } from "@/lib/utils"
import type { OperationRow } from "@/server/operations/queries"

import { cancelOperationAction } from "./actions"

function initials(name: string): string {
  return name.split(" ").filter((word) => word.toLowerCase() !== "by").slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

export function OperationItem({ operation, showAuthor }: { operation: OperationRow; showAuthor: boolean }) {
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const cancelled = operation.status === "CANCELLED"
  const color = operation.operatorColor ?? "var(--primary)"

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await cancelOperationAction({ transactionId: operation.id, reason })
      if (result.ok) setCancelling(false)
      else setError(result.error)
    })
  }

  const details = [
    operation.customerPhone,
    formatTime(operation.createdAt),
    operation.reference ? `Réf. ${operation.reference}` : null,
    showAuthor ? operation.authorName : null,
  ].filter(Boolean)

  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", cancelled && "bg-muted")}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl font-heading font-bold", cancelled && "opacity-50")}
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, white)` }}
        >
          {initials(operation.operatorName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold", cancelled && "text-muted-foreground")}>
            {TYPE_LABELS[operation.type]} {operation.operatorName}
          </p>
          <p className="truncate text-sm text-muted-foreground">{details.join(" · ")}</p>
          {cancelled && (
            <span className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">Annulée</span>
          )}
        </div>
        <div className="text-right">
          <p className={cn("font-heading text-lg font-bold whitespace-nowrap tabular-nums", cancelled && "text-muted-foreground line-through")}>
            {formatFCFA(operation.amount)}
          </p>
          <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {cancelled ? "0 FCFA" : operation.noRule ? "Sans règle" : `Comm. +${formatFCFA(operation.commission)}`}
          </p>
        </div>
      </div>

      {cancelled && operation.cancelReason && (
        <p className="rounded-lg bg-card px-3 py-2 text-sm">
          <span className="text-muted-foreground">Motif : </span>
          <span className="font-semibold">{operation.cancelReason}</span>
        </p>
      )}

      {operation.canCancel &&
        (cancelling ? (
          <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
            <Label htmlFor={`reason-${operation.id}`}>Motif de l&apos;annulation</Label>
            <Input id={`reason-${operation.id}`} value={reason} onChange={(event) => setReason(event.target.value)}
              placeholder="Ex. : erreur de montant" className="h-12 bg-card text-base" autoFocus />
            <p className="text-xs text-muted-foreground">
              L&apos;opération restera visible, barrée. Ses effets sur les soldes seront annulés.
            </p>
            {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button type="button" variant="destructive" className="h-11 flex-1" disabled={isPending || reason.trim().length < 3} onClick={confirm}>
                {isPending ? "Annulation…" : "Confirmer l'annulation"}
              </Button>
              <Button type="button" variant="outline" className="h-11 flex-1" disabled={isPending} onClick={() => setCancelling(false)}>
                Garder
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" className="h-11 self-end text-destructive" onClick={() => setCancelling(true)}>
            Annuler l&apos;opération
          </Button>
        ))}
    </li>
  )
}
