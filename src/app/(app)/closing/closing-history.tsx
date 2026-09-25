"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatDayLabel, formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { ClosingHistoryRow } from "@/server/closing/queries"

import { reopenClosingAction } from "./actions"

function ReopenForm({ closingId, onClose }: { closingId: string; onClose: () => void }) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      const result = await reopenClosingAction({ closingId, reason })
      if (result.ok) onClose()
      else setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
      <Label htmlFor={`reopen-${closingId}`}>Motif de la réouverture</Label>
      <Input id={`reopen-${closingId}`} value={reason} onChange={(event) => setReason(event.target.value)} autoFocus
        placeholder="Ex. : opération oubliée à annuler" className="h-12 bg-card text-base" />
      <p className="text-xs text-muted-foreground">
        L&apos;ajustement sera annulé et les opérations redeviendront annulables. Il faudra refaire la clôture.
      </p>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="destructive" className="h-11 flex-1" disabled={isPending || reason.trim().length < 3} onClick={confirm}>
          {isPending ? "Réouverture…" : "Rouvrir la clôture"}
        </Button>
        <Button type="button" variant="outline" className="h-11 flex-1" disabled={isPending} onClick={onClose}>Annuler</Button>
      </div>
    </div>
  )
}

// Latest closings of the branch, with reopening for the manager (F-44).
export function ClosingHistory({ rows }: { rows: readonly ClosingHistoryRow[] }) {
  const [reopeningId, setReopeningId] = useState<string | null>(null)
  if (rows.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-bold">Dernières clôtures</h2>
      <ul className="flex flex-col divide-y rounded-2xl border bg-card">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {row.closedAt ? `${formatDayLabel(row.closedAt)} à ${formatTime(row.closedAt)}` : "—"}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {row.closedByName ?? "—"} · {row.status === "REOPENED" ? "Rouverte" : "Verrouillée"}
                </p>
              </div>
              <p className={cn("font-heading font-bold whitespace-nowrap tabular-nums", row.totalDifference !== 0 ? "text-destructive" : "text-primary")}>
                {row.totalDifference === 0 ? "Aucun écart" : `${row.totalDifference > 0 ? "+" : ""}${formatFCFA(row.totalDifference)}`}
              </p>
            </div>
            {row.canReopen &&
              (reopeningId === row.id ? (
                <ReopenForm closingId={row.id} onClose={() => setReopeningId(null)} />
              ) : (
                <Button type="button" variant="ghost" className="h-11 self-end" onClick={() => setReopeningId(row.id)}>
                  Rouvrir
                </Button>
              ))}
          </li>
        ))}
      </ul>
    </section>
  )
}
