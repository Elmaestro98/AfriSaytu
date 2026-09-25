"use client"

import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ChevronDown, Coins, LogIn, LogOut, type LucideIcon } from "lucide-react"
import { useState } from "react"

import { formatDayLabel, formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { MOVEMENT_LABELS, type MovementKindKey } from "@/lib/movement-kinds"
import { cn } from "@/lib/utils"
import type { MovementRow } from "@/server/cash/queries"

const ICONS: Record<MovementKindKey, LucideIcon> = {
  UV_TOPUP: ArrowDownToLine,
  UV_SELL: ArrowUpFromLine,
  CASH_IN: LogIn,
  CASH_OUT: LogOut,
  TRANSFER: ArrowLeftRight,
  COMMISSION_PAYOUT: Coins,
}

// Money entering (+) or leaving (−) the branch. The other movements only move money inside it.
const SIGN: Partial<Record<MovementKindKey, "+" | "−">> = { CASH_IN: "+", COMMISSION_PAYOUT: "+", CASH_OUT: "−" }

const VISIBLE = 5

export function MovementList({ movements }: { movements: readonly MovementRow[] }) {
  const [showAll, setShowAll] = useState(false)

  if (movements.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
        Aucun mouvement pour l&apos;instant : approvisionnements, apports et retraits de caisse apparaîtront ici.
      </p>
    )
  }

  const shown = showAll ? movements : movements.slice(0, VISIBLE)
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <ul className="divide-y">
        {shown.map((movement) => {
          const Icon = ICONS[movement.kind]
          const sign = SIGN[movement.kind]
          const route = [movement.fromLabel ?? (movement.kind === "UV_TOPUP" ? "Extérieur" : null), movement.toLabel ?? (movement.kind === "UV_SELL" ? "Extérieur" : null)]
            .filter(Boolean)
            .join(" → ")
          return (
            <li key={movement.id} className="flex items-start gap-3 p-4">
              <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl",
                sign === "+" ? "bg-accent text-accent-foreground" : sign === "−" ? "bg-brand-accent/20 text-brand-accent-strong" : "bg-secondary")}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{MOVEMENT_LABELS[movement.kind]}</p>
                {route && <p className="truncate text-sm">{route}</p>}
                <p className="truncate text-sm text-muted-foreground">
                  {[movement.payoutLabel, movement.authorName, `${formatDayLabel(movement.createdAt)} ${formatTime(movement.createdAt)}`, movement.description].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className={cn("font-heading font-bold whitespace-nowrap tabular-nums", sign === "+" && "text-primary", sign === "−" && "text-brand-accent-strong")}>
                {sign ?? ""}{formatFCFA(movement.amount)}
              </p>
            </li>
          )
        })}
      </ul>
      {movements.length > VISIBLE && (
        <button type="button" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}
          className="flex min-h-12 w-full items-center justify-center gap-1 border-t bg-muted/50 text-sm font-semibold text-primary">
          {showAll ? "Afficher moins" : `Voir les ${movements.length} derniers mouvements`}
          <ChevronDown className={cn("size-4 transition-transform", showAll && "rotate-180")} aria-hidden />
        </button>
      )}
    </div>
  )
}
