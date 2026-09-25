"use client"

import { History, Plus, TriangleAlert } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { formatFCFA } from "@/lib/money"
import type { MovementKindKey } from "@/lib/movement-kinds"
import { cn } from "@/lib/utils"
import type { CashAccount } from "@/server/cash/queries"

type AccountCardProps = {
  account: CashAccount
  canViewLedger: boolean
  onMovement: (kind: MovementKindKey, accountId: string) => void
}

export function AccountCard({ account, canViewLedger, onMovement }: AccountCardProps) {
  const threshold = account.alertThreshold ?? 0
  const low = threshold > 0 && account.balance < threshold
  const negative = account.balance < 0
  const color = account.color ?? "var(--primary)"
  const isCash = account.kind === "CASH"

  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", low && "border-brand-accent bg-brand-accent/5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-heading text-lg font-bold">
            <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate">{account.label}</span>
          </p>
          {account.accountNumber && <p className="text-sm text-muted-foreground">N° {account.accountNumber}</p>}
        </div>
        {low && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-accent px-2.5 py-1 text-xs font-bold text-brand-accent-foreground">
            <TriangleAlert className="size-3.5" aria-hidden />
            Solde bas
          </span>
        )}
      </div>

      <div>
        <p className="text-sm text-muted-foreground">{isCash ? "Espèces en caisse" : "Solde UV disponible"}</p>
        <p className={cn("font-heading text-3xl font-extrabold tabular-nums", negative && "text-destructive")}>{formatFCFA(account.balance)}</p>
        {threshold > 0 && (
          <p className={cn("mt-1 text-sm", low ? "font-semibold" : "text-muted-foreground")}>
            {low ? `Manque ${formatFCFA(threshold - account.balance)} pour atteindre le seuil de ${formatFCFA(threshold)}` : `Seuil d'alerte : ${formatFCFA(threshold)}`}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {isCash ? (
          <>
            <Button type="button" className="h-11 flex-1" onClick={() => onMovement("CASH_IN", account.id)}>
              <Plus className="size-4" aria-hidden /> Apport
            </Button>
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => onMovement("CASH_OUT", account.id)}>
              Retrait
            </Button>
          </>
        ) : (
          <Button type="button" className={cn("h-11 flex-1", low && "bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90")}
            onClick={() => onMovement("UV_TOPUP", account.id)}>
            <Plus className="size-4" aria-hidden /> Approvisionner
          </Button>
        )}
        {canViewLedger && (
          <Button asChild variant="outline" className="h-11 flex-1">
            <Link href={`/cash/accounts/${account.id}`}>
              <History className="size-4" aria-hidden /> Grand livre
            </Link>
          </Button>
        )}
      </div>
    </li>
  )
}
