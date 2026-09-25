"use client"

import { Pencil, X } from "lucide-react"
import { Fragment, useState } from "react"

import { OperatorBadge } from "@/components/business/operator-badge"
import { Button } from "@/components/ui/button"
import { formatDayLabel, formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import { cn } from "@/lib/utils"
import type { OperationRow } from "@/server/operations/queries"

import { CancelPanel } from "./cancel-panel"

type OperationsTableProps = {
  operations: readonly OperationRow[]
  showAuthor: boolean
}

// Desktop view of the latest operations: one row per operation (mockup 01).
export function OperationsTable({ operations, showAuthor }: OperationsTableProps) {
  const [cancelling, setCancelling] = useState<{ id: string; correct: boolean } | null>(null)
  const cancellingId = cancelling?.id ?? null
  const columns = showAuthor ? 8 : 7

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Opération</th>
            <th scope="col" className="hidden px-4 py-3 xl:table-cell">Client</th>
            <th scope="col" className="hidden px-4 py-3 xl:table-cell">Référence</th>
            {showAuthor && <th scope="col" className="px-4 py-3">Agent</th>}
            <th scope="col" className="px-4 py-3 text-right">Montant</th>
            <th scope="col" className="px-4 py-3 text-right">Commission</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {operations.map((operation) => {
            const cancelled = operation.status === "CANCELLED"
            return (
              <Fragment key={operation.id}>
                <tr className={cn(cancelled && "bg-muted/50")}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="block font-semibold">{formatTime(operation.createdAt)}</span>
                    <span className="block text-xs text-muted-foreground">{formatDayLabel(operation.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("flex items-center gap-2 font-semibold", cancelled && "text-muted-foreground")}>
                      <OperatorBadge name={operation.operatorName} color={operation.operatorColor} logoSrc={operation.operatorLogoSrc}
                        className={cn("size-7 text-[10px]", cancelled && "opacity-50")} />
                      {TYPE_LABELS[operation.type]} {operation.operatorName}
                    </span>
                    {cancelled && (
                      <span className="mt-1 block text-xs">
                        <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">Annulée</span>
                        {operation.cancelReason && <span className="ml-2 text-muted-foreground">{operation.cancelReason}</span>}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 whitespace-nowrap tabular-nums xl:table-cell">{operation.customerPhone ?? "—"}</td>
                  <td className="hidden px-4 py-3 xl:table-cell">{operation.reference ?? "—"}</td>
                  {showAuthor && <td className="px-4 py-3">{operation.authorName}</td>}
                  <td className={cn("px-4 py-3 text-right font-heading text-base font-bold whitespace-nowrap tabular-nums", cancelled && "text-muted-foreground line-through")}>
                    {formatFCFA(operation.amount)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {cancelled ? "—" : operation.noRule ? <span className="text-muted-foreground">Sans règle</span>
                      : operation.dailyCommission ? <span className="text-muted-foreground">Du jour</span> : `+${formatFCFA(operation.commission)}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {operation.canCancel && cancellingId !== operation.id && (
                      <span className="flex justify-end gap-1">
                        <Button type="button" variant="outline" size="icon" className="size-9" title="Corriger"
                          aria-label={`Corriger : ${TYPE_LABELS[operation.type]} ${operation.operatorName}`} onClick={() => setCancelling({ id: operation.id, correct: true })}>
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" title="Annuler"
                          aria-label={`Annuler : ${TYPE_LABELS[operation.type]} ${operation.operatorName}`} onClick={() => setCancelling({ id: operation.id, correct: false })}>
                          <X className="size-4" aria-hidden />
                        </Button>
                      </span>
                    )}
                  </td>
                </tr>
                {cancellingId === operation.id && (
                  <tr>
                    <td colSpan={columns} className="px-4 pb-4">
                      <CancelPanel transactionId={operation.id} thenCorrect={cancelling?.correct ?? false} onClose={() => setCancelling(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
