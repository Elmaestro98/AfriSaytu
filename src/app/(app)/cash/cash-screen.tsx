"use client"

import { ArrowLeftRight, Banknote, CircleCheck, RefreshCw, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { MOVEMENT_LABELS, type MovementKindKey } from "@/lib/movement-kinds"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query"
import type { CashContext } from "@/server/cash/queries"

import { AccountCard } from "./account-card"
import { MovementForm } from "./movement-form"
import { MovementList } from "./movement-list"

type FormState = { kind: MovementKindKey; accountId?: string; key: number } | null

type CashScreenProps = { context: CashContext; branchName: string; loadedAt: Date }

export function CashScreen({ context, branchName, loadedAt }: CashScreenProps) {
  const router = useRouter()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [form, setForm] = useState<FormState>(null)
  const [feedback, setFeedback] = useState<{ text: string; warning: string | null } | null>(null)
  const [isRefreshing, startRefresh] = useTransition()

  const uvTotal = context.accounts.filter((account) => account.kind === "OPERATOR").reduce((sum, account) => sum + account.balance, 0)
  const cashTotal = context.accounts.filter((account) => account.kind === "CASH").reduce((sum, account) => sum + account.balance, 0)

  const open = (kind: MovementKindKey, accountId?: string) => {
    setFeedback(null)
    setForm({ kind, accountId, key: Date.now() }) // a new key = a fresh form and a new idempotency key
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
      <div className="contents lg:flex lg:flex-col lg:gap-6">
        <section aria-labelledby="accounts-title" className="order-3 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="accounts-title" className="font-heading text-xl font-bold">Comptes et caisse</h2>
            <span className="text-sm text-muted-foreground">{context.accounts.length} compte{context.accounts.length > 1 ? "s" : ""}</span>
          </div>
          <ul className="flex flex-col gap-3">
            {context.accounts.map((account) => (
              <AccountCard key={account.id} account={account} canViewLedger={context.canViewLedger} onMovement={open} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="movements-title" className="order-4 flex flex-col gap-3">
          <div>
            <h2 id="movements-title" className="font-heading text-xl font-bold">Mouvements internes</h2>
            <p className="text-sm text-muted-foreground">Approvisionnements, apports, retraits et transferts</p>
          </div>
          <MovementList movements={context.movements} />
        </section>
      </div>

      <div className="contents lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-4">
        <div className="order-1 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Mis à jour à {formatTime(loadedAt)}</p>
          <Button type="button" variant="outline" className="h-11" disabled={isRefreshing} onClick={() => startRefresh(() => router.refresh())}>
            <RefreshCw className={isRefreshing ? "size-4 animate-spin" : "size-4"} aria-hidden /> Actualiser
          </Button>
        </div>

        <section className="order-2 flex flex-col gap-4 rounded-2xl bg-primary p-5 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Trésorerie du point de vente</p>
            <span className="truncate rounded-md bg-primary-foreground/15 px-2 py-0.5 text-xs font-bold">{branchName}</span>
          </div>
          <p className="font-heading text-4xl font-extrabold tabular-nums">{formatFCFA(uvTotal + cashTotal)}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary-foreground/10 p-3">
              <p className="flex items-center gap-1.5 text-xs opacity-80"><Smartphone className="size-3.5" aria-hidden /> UV opérateurs</p>
              <p className="font-heading text-lg font-bold tabular-nums">{formatFCFA(uvTotal)}</p>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-3">
              <p className="flex items-center gap-1.5 text-xs opacity-80"><Banknote className="size-3.5" aria-hidden /> Espèces</p>
              <p className="font-heading text-lg font-bold tabular-nums">{formatFCFA(cashTotal)}</p>
            </div>
          </div>
          <Button type="button" variant="secondary" className="h-11" onClick={() => open("UV_TOPUP")}>
            <ArrowLeftRight className="size-4" aria-hidden /> Autre mouvement
          </Button>
        </section>

        {feedback && (
          <div role="status" className="order-2 rounded-xl bg-accent p-3 text-sm font-semibold text-accent-foreground">
            <p className="flex items-start gap-2"><CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />{feedback.text}</p>
            {feedback.warning && <p className="mt-1 font-normal">{feedback.warning}</p>}
          </div>
        )}
      </div>

      <Sheet open={form !== null} onOpenChange={(isOpen) => !isOpen && setForm(null)}>
        <SheetContent side={desktop ? "right" : "bottom"} className="max-h-[92svh] overflow-y-auto rounded-t-2xl lg:max-h-none lg:rounded-none">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">{form ? MOVEMENT_LABELS[form.kind] : "Mouvement"}</SheetTitle>
            <SheetDescription>Mouvement sans client : il modifie les soldes du point de vente.</SheetDescription>
          </SheetHeader>
          {form && (
            <div className="px-4 pb-6">
              <MovementForm key={form.key} branchId={context.branchId} accounts={context.accounts} initialKind={form.kind}
                initialAccountId={form.accountId} onCancel={() => setForm(null)}
                onDone={(text, warning) => { setForm(null); setFeedback({ text, warning }); router.refresh() }} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
