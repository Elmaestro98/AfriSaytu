"use client"

import { Fragment, useState } from "react"

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
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const columns = showAuthor ? 8 : 7

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Opération</th>
            <th scope="col" className="px-4 py-3">Client</th>
            <th scope="col" className="px-4 py-3">Référence</th>
            {showAuthor && <th scope="col" className="px-4 py-3">Agent</th>}
            <th scope="col" className="px-4 py-3 text-right">Montant</th>
            <th scope="col" className="px-4 py-3 text-right">Commission</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {operations.map((operation) => {
            const cancelled = operation.status === "CANCELLED"
            const color = operation.operatorColor ?? "var(--primary)"
            return (
              <Fragment key={operation.id}>
                <tr className={cn(cancelled && "bg-muted/50")}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="block font-semibold">{formatTime(operation.createdAt)}</span>
                    <span className="block text-xs text-muted-foreground">{formatDayLabel(operation.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("flex items-center gap-2 font-semibold", cancelled && "text-muted-foreground")}>
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      {TYPE_LABELS[operation.type]} {operation.operatorName}
                    </span>
                    {cancelled && (
                      <span className="mt-1 block text-xs">
                        <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">Annulée</span>
                        {operation.cancelReason && <span className="ml-2 text-muted-foreground">{operation.cancelReason}</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">{operation.customerPhone ?? "—"}</td>
                  <td className="px-4 py-3">{operation.reference ?? "—"}</td>
                  {showAuthor && <td className="px-4 py-3">{operation.authorName}</td>}
                  <td className={cn("px-4 py-3 text-right font-heading text-base font-bold whitespace-nowrap tabular-nums", cancelled && "text-muted-foreground line-through")}>
                    {formatFCFA(operation.amount)}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {cancelled ? "—" : operation.noRule ? <span className="text-muted-foreground">Sans règle</span> : `+${formatFCFA(operation.commission)}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {operation.canCancel && cancellingId !== operation.id && (
                      <Button type="button" variant="ghost" className="h-9 text-destructive" onClick={() => setCancellingId(operation.id)}>
                        Annuler
                      </Button>
                    )}
                  </td>
                </tr>
                {cancellingId === operation.id && (
                  <tr>
                    <td colSpan={columns} className="px-4 pb-4">
                      <CancelPanel transactionId={operation.id} onClose={() => setCancellingId(null)} />
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
