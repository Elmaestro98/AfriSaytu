"use client"

import { ArrowLeftRight, CircleCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { formatDayLabel, formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import { MOVEMENT_LABELS, type MovementKindKey } from "@/lib/movement-kinds"
import type { CashContext } from "@/server/cash/queries"

import { AccountCard } from "./account-card"
import { MovementForm } from "./movement-form"

type FormState = { kind: MovementKindKey; accountId?: string; key: number } | null

export function CashScreen({ context }: { context: CashContext }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(null)
  const [feedback, setFeedback] = useState<{ text: string; warning: string | null } | null>(null)

  const uvTotal = context.accounts.filter((account) => account.kind === "OPERATOR").reduce((sum, account) => sum + account.balance, 0)
  const cashTotal = context.accounts.filter((account) => account.kind === "CASH").reduce((sum, account) => sum + account.balance, 0)

  const open = (kind: MovementKindKey, accountId?: string) => {
    setFeedback(null)
    setForm({ kind, accountId, key: Date.now() }) // a new key = a fresh form and a new idempotency key
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Trésorerie du point de vente</p>
        <p className="mt-1 font-heading text-4xl font-extrabold tabular-nums">{formatFCFA(uvTotal + cashTotal)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="text-xs opacity-80">UV opérateurs</p>
            <p className="font-heading text-lg font-bold tabular-nums">{formatFCFA(uvTotal)}</p>
          </div>
          <div className="rounded-xl bg-primary-foreground/10 p-3">
            <p className="text-xs opacity-80">Espèces</p>
            <p className="font-heading text-lg font-bold tabular-nums">{formatFCFA(cashTotal)}</p>
          </div>
        </div>
      </section>

      {feedback && (
        <div role="status" className="rounded-xl bg-accent p-3 text-sm font-semibold text-accent-foreground">
          <p className="flex items-start gap-2"><CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />{feedback.text}</p>
          {feedback.warning && <p className="mt-1 font-normal">{feedback.warning}</p>}
        </div>
      )}

      {form ? (
        <MovementForm key={form.key} branchId={context.branchId} accounts={context.accounts} initialKind={form.kind}
          initialAccountId={form.accountId} onCancel={() => setForm(null)}
          onDone={(text, warning) => { setForm(null); setFeedback({ text, warning }); router.refresh() }} />
      ) : (
        <Button type="button" variant="outline" className="h-12 text-base" onClick={() => open("UV_TOPUP")}>
          <ArrowLeftRight className="size-5" aria-hidden /> Nouveau mouvement interne
        </Button>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold">Comptes et caisse</h2>
        <ul className="flex flex-col gap-3">
          {context.accounts.map((account) => (
            <AccountCard key={account.id} account={account} canViewLedger={context.canViewLedger} onMovement={open} />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-bold">Mouvements internes</h2>
        {context.movements.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Aucun mouvement pour l&apos;instant : approvisionnements, apports et retraits de caisse apparaîtront ici.
          </p>
        ) : (
          <ul className="flex flex-col divide-y rounded-2xl border bg-card">
            {context.movements.map((movement) => (
              <li key={movement.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold">{MOVEMENT_LABELS[movement.kind]}</p>
                  <p className="text-sm text-muted-foreground">
                    {[movement.fromLabel && `De ${movement.fromLabel}`, movement.toLabel && `vers ${movement.toLabel}`].filter(Boolean).join(" ")}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {[movement.authorName, `${formatDayLabel(movement.createdAt)} ${formatTime(movement.createdAt)}`, movement.description].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="font-heading font-bold whitespace-nowrap tabular-nums">{formatFCFA(movement.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
