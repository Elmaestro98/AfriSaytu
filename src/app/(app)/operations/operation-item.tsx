"use client"

import { useState } from "react"

import { OperatorBadge } from "@/components/business/operator-badge"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import { cn } from "@/lib/utils"
import type { OperationRow } from "@/server/operations/queries"

import { CancelPanel } from "./cancel-panel"

export function OperationItem({ operation, showAuthor }: { operation: OperationRow; showAuthor: boolean }) {
  const [cancelling, setCancelling] = useState<"cancel" | "correct" | null>(null)
  const cancelled = operation.status === "CANCELLED"

  const details = [
    operation.customerPhone,
    formatTime(operation.createdAt),
    operation.reference ? `Réf. ${operation.reference}` : null,
    showAuthor ? operation.authorName : null,
  ].filter(Boolean)

  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", cancelled && "bg-muted")}>
      <div className="flex items-start gap-3">
        <OperatorBadge name={operation.operatorName} color={operation.operatorColor} logoSrc={operation.operatorLogoSrc}
          className={cn("size-11 font-heading text-base", cancelled && "opacity-50")} />
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
            {cancelled ? "0 FCFA" : operation.noRule ? "Sans règle" : operation.dailyCommission ? "Commission du jour" : `Comm. +${formatFCFA(operation.commission)}`}
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
          <CancelPanel transactionId={operation.id} thenCorrect={cancelling === "correct"} onClose={() => setCancelling(null)} />
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="h-11" onClick={() => setCancelling("correct")}>
              Corriger
            </Button>
            <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={() => setCancelling("cancel")}>
              Annuler l&apos;opération
            </Button>
          </div>
        ))}
    </li>
  )
}
