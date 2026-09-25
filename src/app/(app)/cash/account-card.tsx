"use client"

import { Banknote, BookOpen, Check, Copy, Plus, TriangleAlert, Wallet, Zap } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { THRESHOLD_POSITION, balanceLevel } from "@/lib/balance-level"
import { formatFCFA } from "@/lib/money"
import type { MovementKindKey } from "@/lib/movement-kinds"
import { cn } from "@/lib/utils"
import type { CashAccount } from "@/server/cash/queries"

type AccountCardProps = {
  account: CashAccount
  canViewLedger: boolean
  onMovement: (kind: MovementKindKey, accountId: string) => void
}

function initials(name: string): string {
  return name.split(" ").filter((word) => word.toLowerCase() !== "by").slice(0, 2).map((word) => word[0]).join("").toUpperCase()
}

function CopyNumber({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard unavailable (http page on a phone): the number stays readable on screen.
    }
  }
  return (
    <button type="button" onClick={copy} aria-label={`Copier le numéro ${value}`}
      className="-my-2 flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      N° {value}
      {copied ? <Check className="size-3.5 text-primary" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </button>
  )
}

// One account of the cash screen (mockup 04): balance, level against the alert threshold, actions.
export function AccountCard({ account, canViewLedger, onMovement }: AccountCardProps) {
  const isCash = account.kind === "CASH"
  const level = balanceLevel(account.balance, account.alertThreshold)
  const color = account.color ?? "var(--primary)"
  const ledgerHref = `/cash/accounts/${account.id}`

  // The card adapts to its own width (container queries): stacked in a narrow column,
  // balance | gauge | actions side by side when there is room.
  return (
    <li className={cn("@container rounded-2xl border bg-card p-4", level.low && "border-brand-accent/60 bg-brand-accent/[0.06]")}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl font-heading font-bold", isCash && "bg-accent text-accent-foreground")}
            style={isCash ? undefined : { color, backgroundColor: `color-mix(in srgb, ${color} 16%, white)` }}>
            {isCash ? <Banknote className="size-5" /> : initials(account.label)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg leading-tight font-bold break-words">{account.label}</p>
            {account.accountNumber ? <CopyNumber value={account.accountNumber} /> : <p className="text-sm text-muted-foreground">{isCash ? "Tiroir physique" : "Compte agent"}</p>}
          </div>
          {level.low ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-accent px-2.5 py-1 text-xs font-bold whitespace-nowrap text-brand-accent-foreground">
              <TriangleAlert className="size-3.5" aria-hidden /> Solde bas
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">{isCash ? "Espèces" : "Actif"}</span>
          )}
        </div>

        <div className="flex flex-col gap-4 @xl:grid @xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] @xl:items-end @xl:gap-6">
          <div>
            <p className={cn("text-sm", level.low ? "font-semibold text-brand-accent-strong" : "text-muted-foreground")}>
              {isCash ? "Espèces en caisse" : level.low ? "Solde critique disponible" : "Solde UV disponible"}
            </p>
            <p className={cn("font-heading text-3xl font-extrabold whitespace-nowrap tabular-nums", level.low && "text-brand-accent-strong", account.balance < 0 && "text-destructive")}>
              {formatFCFA(account.balance)}
            </p>
          </div>

          {level.hasThreshold ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
                <span className="text-muted-foreground">Seuil d&apos;alerte : {formatFCFA(account.alertThreshold ?? 0)}</span>
                <span className={cn("font-semibold", level.low ? "text-brand-accent-strong" : "text-primary")}>
                  {level.low ? `Manque ${formatFCFA(level.missing)}` : "Au-dessus du seuil"}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted" role="img"
                aria-label={level.low ? `Sous le seuil, il manque ${formatFCFA(level.missing)}` : "Au-dessus du seuil d'alerte"}>
                <div className={cn("h-2 rounded-full", level.low ? "bg-brand-accent" : "bg-primary")} style={{ width: `${level.fill * 100}%` }} />
                <span aria-hidden className="absolute -top-1 h-4 w-0.5 rounded bg-foreground/40" style={{ left: `${THRESHOLD_POSITION * 100}%` }} />
              </div>
              {level.low && (
                <p className="text-xs text-muted-foreground">
                  {isCash ? "Espèces insuffisantes pour les prochains retraits clients." : "Risque de blocage sur les gros dépôts et envois clients."}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground @xl:self-center">Aucun seuil d&apos;alerte</p>
          )}

          <div className="flex gap-2">
            {isCash ? (
              <>
                <Button type="button" className="h-11 flex-1 @xl:flex-none" onClick={() => onMovement("CASH_IN", account.id)}>
                  <Plus className="size-4" aria-hidden /> Apport
                </Button>
                <Button type="button" variant="outline" className="h-11 flex-1 @xl:flex-none" onClick={() => onMovement("CASH_OUT", account.id)}>
                  <Wallet className="size-4" aria-hidden /> Retrait
                </Button>
              </>
            ) : (
              <Button type="button" className={cn("h-11 flex-1 @xl:flex-none", level.low && "bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90")}
                onClick={() => onMovement("UV_TOPUP", account.id)}>
                {level.low ? <Zap className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />} Approvisionner
              </Button>
            )}
            {canViewLedger && (
              <Button asChild variant="outline" className="size-11 shrink-0 px-0">
                <Link href={ledgerHref} aria-label={`Grand livre de ${account.label}`} title="Grand livre">
                  <BookOpen className="size-4" aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}
