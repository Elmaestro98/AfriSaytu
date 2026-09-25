"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import { cn } from "@/lib/utils"
import type { OperationRow } from "@/server/operations/queries"

import { CancelPanel } from "./cancel-panel"

function initials(name: string): string {
  return name.split(" ").filter((word) => word.toLowerCase() !== "by").slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

export function OperationItem({ operation, showAuthor }: { operation: OperationRow; showAuthor: boolean }) {
  const [cancelling, setCancelling] = useState(false)
  const cancelled = operation.status === "CANCELLED"
  const color = operation.operatorColor ?? "var(--primary)"

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
          <CancelPanel transactionId={operation.id} onClose={() => setCancelling(false)} />
        ) : (
          <Button type="button" variant="ghost" className="h-11 self-end text-destructive" onClick={() => setCancelling(true)}>
            Annuler l&apos;opération
          </Button>
        ))}
    </li>
  )
}
