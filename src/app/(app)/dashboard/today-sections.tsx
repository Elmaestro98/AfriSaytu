import { ArrowDownLeft, ArrowUpRight, Banknote, ChevronRight, Zap } from "lucide-react"
import Link from "next/link"

import { OperatorBadge } from "@/components/business/operator-badge"
import { THRESHOLD_POSITION } from "@/lib/balance-level"
import { formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import { cn } from "@/lib/utils"
import type { TodaySummary } from "@/server/dashboard/today"
import type { OperationRow } from "@/server/operations/queries"

// Balances of the accounts (mockup 02): one card each, with the level against the alert threshold.
export function BalanceCards({ today, canEnter }: { today: TodaySummary; canEnter: boolean }) {
  return (
    <section aria-labelledby="balances-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="balances-title" className="font-heading text-lg font-bold">Soldes des comptes</h2>
        {canEnter && (
          <Link href="/cash" className="flex items-center gap-1 text-sm font-semibold text-primary">
            Caisse <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {today.balances.map((balance) => {
          const low = balance.level.low
          return (
            <li key={balance.id} className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", low && "border-brand-accent/60 bg-brand-accent/[0.06]")}>
              <div className="flex items-center gap-2.5">
                {balance.kind === "CASH" ? (
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Banknote className="size-4" />
                  </span>
                ) : (
                  <OperatorBadge name={balance.label} color={balance.color} logoSrc={balance.logoSrc} className="size-9 text-xs" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{balance.label}</span>
                  {today.showBranch && <span className="block truncate text-xs text-muted-foreground">{balance.branchName}</span>}
                </span>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", low ? "bg-brand-accent text-brand-accent-foreground" : "bg-secondary")}>
                  {low ? "Solde bas" : balance.kind === "CASH" ? "Espèces" : "Actif"}
                </span>
              </div>
              <p className={cn("font-heading text-2xl font-extrabold whitespace-nowrap tabular-nums", low && "text-brand-accent-strong", balance.balance < 0 && "text-destructive")}>
                {formatFCFA(balance.balance)}
              </p>
              {balance.level.hasThreshold ? (
                <div className="flex flex-col gap-1.5">
                  <div className="relative h-1.5 rounded-full bg-muted" aria-hidden>
                    <div className={cn("h-1.5 rounded-full", low ? "bg-brand-accent" : "bg-primary")} style={{ width: `${balance.level.fill * 100}%` }} />
                    <span className="absolute -top-1 h-3.5 w-0.5 rounded bg-foreground/40" style={{ left: `${THRESHOLD_POSITION * 100}%` }} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={cn(low ? "font-semibold text-brand-accent-strong" : "text-muted-foreground")}>
                      {low ? `Manque ${formatFCFA(balance.level.missing)}` : `Seuil ${formatFCFA(balance.alertThreshold ?? 0)}`}
                    </span>
                    {low && canEnter && (
                      <Link href="/cash" className="inline-flex min-h-8 items-center gap-1 rounded-md bg-brand-accent px-2 font-bold text-brand-accent-foreground">
                        <Zap className="size-3.5" aria-hidden /> Recharger
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Aucun seuil d&apos;alerte</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// Money entering the cash drawer (deposit, send, airtime, bill) is shown "in"; a withdrawal "out".
const CASH_OUT_TYPES = new Set(["WITHDRAWAL"])

// Latest operations (mockup 02): type, operator, customer, time, commission, amount.
export function RecentOperations({ operations }: { operations: readonly OperationRow[] }) {
  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-title" className="font-heading text-lg font-bold">Dernières opérations</h2>
        <Link href="/operations" className="flex items-center gap-1 text-sm font-semibold text-primary">
          Voir tout <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
      {operations.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Aucune opération pour l&apos;instant.</p>
      ) : (
        <ul className="-mx-1 flex flex-col divide-y">
          {operations.map((operation) => {
            const cancelled = operation.status === "CANCELLED"
            const out = CASH_OUT_TYPES.has(operation.type)
            const Icon = out ? ArrowUpRight : ArrowDownLeft
            return (
              <li key={operation.id} className="flex items-center gap-3 px-1 py-3">
                <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl",
                  cancelled ? "bg-muted text-muted-foreground" : out ? "bg-brand-accent/20 text-brand-accent-strong" : "bg-accent text-accent-foreground")}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("flex items-center gap-2 font-semibold", cancelled && "text-muted-foreground line-through")}>
                    {TYPE_LABELS[operation.type]}
                    <span className="inline-flex items-center gap-1 rounded py-0.5 pr-1.5 pl-0.5 text-[11px] font-bold no-underline"
                      style={{ color: operation.operatorColor ?? undefined, backgroundColor: `color-mix(in srgb, ${operation.operatorColor ?? "var(--primary)"} 14%, white)` }}>
                      <OperatorBadge name={operation.operatorName} color={operation.operatorColor} logoSrc={operation.operatorLogoSrc}
                        className="size-5 border-0 p-0.5 text-[8px]" />
                      {operation.operatorName}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[formatTime(operation.createdAt), operation.customerPhone, cancelled ? "Annulée" : operation.noRule ? "Sans règle" : `Comm. +${formatFCFA(operation.commission)}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className={cn("font-heading font-bold whitespace-nowrap tabular-nums",
                  cancelled ? "text-muted-foreground line-through" : out ? "text-foreground" : "text-primary")}>
                  {cancelled ? "" : out ? "−" : "+"}{formatFCFA(operation.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
