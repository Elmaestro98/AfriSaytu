"use client"

import { CircleCheck, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { PeriodAccount } from "@/server/closing/queries"

type ReconcileCardProps = {
  account: PeriodAccount
  counted: number | null // null = not entered yet
  justification: string
  justificationRequired: boolean
  onJustification: (text: string) => void
  children: ReactNode // how the counted balance is entered (amount field or banknote count)
}

// One account of the closing (mockup 05): theoretical vs counted, and the difference.
export function ReconcileCard({ account, counted, justification, justificationRequired, onJustification, children }: ReconcileCardProps) {
  const difference = counted === null ? null : counted - account.theoretical
  const color = account.color ?? "var(--primary)"

  return (
    <section className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", difference !== null && difference !== 0 && "border-destructive/40")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold">
          <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: color }} />
          {account.label}
        </h3>
        {difference === 0 && (
          <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
            <CircleCheck className="size-3.5" aria-hidden /> Conforme
          </span>
        )}
        {difference !== null && difference !== 0 && (
          <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
            <TriangleAlert className="size-3.5" aria-hidden /> Écart
          </span>
        )}
      </div>

      <div className="rounded-xl bg-muted px-3 py-2">
        <p className="text-xs text-muted-foreground">Solde théorique</p>
        <p className="font-heading text-xl font-bold tabular-nums">{formatFCFA(account.theoretical)}</p>
      </div>

      {children}

      <p className="flex items-baseline justify-between gap-3 border-t pt-3">
        <span className="text-sm">{difference !== null && difference < 0 ? "Manquant" : difference !== null && difference > 0 ? "Excédent" : "Écart"}</span>
        <span className={cn("font-heading text-lg font-bold tabular-nums", difference !== null && difference !== 0 && "text-destructive")}>
          {difference === null ? "—" : `${difference > 0 ? "+" : ""}${formatFCFA(difference)}`}
        </span>
      </p>

      {justificationRequired && (
        <div className="flex flex-col gap-2 rounded-xl bg-destructive/5 p-3">
          <label htmlFor={`justification-${account.id}`} className="text-sm font-semibold">
            Justification de l&apos;écart <span className="text-destructive">*</span>
          </label>
          <textarea
            id={`justification-${account.id}`}
            rows={3}
            maxLength={500}
            value={justification}
            onChange={(event) => onJustification(event.target.value)}
            placeholder="Ex. : erreur de rendu monnaie sur un retrait"
            className="rounded-lg border bg-card p-3 text-base focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </div>
      )}
    </section>
  )
}
