"use client"

import { CircleCheck, Lock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { AmountInput } from "@/components/business/amount-input"
import { Button } from "@/components/ui/button"
import { cashCountTotal, type CashCount } from "@/lib/cash-count"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { needsJustification } from "@/server/closing/compute"
import type { ClosingContext } from "@/server/closing/queries"

import { validateClosingAction } from "./actions"
import { CashCounter } from "./cash-counter"
import { ReconcileCard } from "./reconcile-card"

export function ClosingScreen({ context }: { context: ClosingContext }) {
  const router = useRouter()
  const [counted, setCounted] = useState<Record<string, number | null>>({})
  const [cashCount, setCashCount] = useState<CashCount>({})
  const [justifications, setJustifications] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const operatorAccounts = context.accounts.filter((account) => account.kind === "OPERATOR")
  const cashAccounts = context.accounts.filter((account) => account.kind === "CASH")
  const cashTotal = cashCountTotal(cashCount)
  const countedOf = (id: string, kind: "OPERATOR" | "CASH") => (kind === "CASH" ? cashTotal : (counted[id] ?? null))

  const lines = context.accounts.map((account) => {
    const value = countedOf(account.id, account.kind)
    const difference = value === null ? null : value - account.theoretical
    const required = difference !== null && needsJustification(difference, context.threshold)
    return { account, value, difference, required, justification: justifications[account.id] ?? "" }
  })
  const missing = lines.filter((line) => line.value === null).length
  const unjustified = lines.filter((line) => line.required && line.justification.trim().length === 0).length
  const totalDifference = lines.reduce((sum, line) => sum + (line.difference ?? 0), 0)
  const ready = missing === 0 && unjustified === 0

  const setJustification = (id: string, text: string) => setJustifications({ ...justifications, [id]: text })

  const submit = () => {
    setFeedback(null)
    startTransition(async () => {
      const result = await validateClosingAction({
        branchId: context.branchId,
        previousClosingId: context.previousClosingId,
        cashCount,
        lines: lines.map((line) => ({ accountId: line.account.id, counted: line.value ?? 0, justification: line.required ? line.justification : null })),
      })
      setConfirming(false)
      if (result.ok) {
        setFeedback({ kind: "ok", text: "Clôture validée. La journée est verrouillée et les soldes constatés deviennent les soldes d'ouverture." })
        setCounted({})
        setCashCount({})
        setJustifications({})
        router.refresh()
      } else {
        setFeedback({ kind: "error", text: result.error })
      }
    })
  }

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <div className="flex flex-col gap-5">
        {operatorAccounts.map((account) => {
          const line = lines.find((item) => item.account.id === account.id)!
          return (
            <ReconcileCard key={account.id} account={account} counted={line.value} justification={line.justification}
              justificationRequired={line.required} onJustification={(text) => setJustification(account.id, text)}>
              <div className="flex flex-col gap-2">
                <label htmlFor={`counted-${account.id}`} className="text-sm font-semibold">Solde réel affiché dans l&apos;application</label>
                <AmountInput id={`counted-${account.id}`} value={line.value ?? 0}
                  onValueChange={(value) => setCounted({ ...counted, [account.id]: value })} />
                <button type="button" onClick={() => setCounted({ ...counted, [account.id]: account.theoretical })}
                  className="min-h-11 self-start text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  Identique au théorique
                </button>
              </div>
            </ReconcileCard>
          )
        })}
      </div>

      <div className="flex flex-col gap-5 lg:sticky lg:top-24">
        {cashAccounts.map((account) => {
          const line = lines.find((item) => item.account.id === account.id)!
          return (
            <ReconcileCard key={account.id} account={account} counted={line.value} justification={line.justification}
              justificationRequired={line.required} onJustification={(text) => setJustification(account.id, text)}>
              <CashCounter value={cashCount} onChange={setCashCount} />
              <p className="flex items-baseline justify-between rounded-xl bg-accent px-3 py-2 text-accent-foreground">
                <span className="text-sm font-semibold">Total espèces compté</span>
                <span className="font-heading text-2xl font-extrabold tabular-nums">{formatFCFA(cashTotal)}</span>
              </p>
            </ReconcileCard>
          )
        })}

        <div className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur lg:static lg:shadow-none">
          {feedback && (
            <p role={feedback.kind === "ok" ? "status" : "alert"}
              className={cn("flex items-start gap-2 rounded-xl p-3 text-sm font-semibold", feedback.kind === "ok" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive")}>
              {feedback.kind === "ok" && <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
              {feedback.text}
            </p>
          )}
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-sm">Écart total</span>
            <span className={cn("font-heading text-xl font-bold tabular-nums", totalDifference !== 0 && "text-destructive")}>
              {missing > 0 ? "—" : `${totalDifference > 0 ? "+" : ""}${formatFCFA(totalDifference)}`}
            </span>
          </p>
          {!ready && (
            <p className="text-sm text-muted-foreground">
              {missing > 0 ? `Saisissez le solde réel de ${missing} compte${missing > 1 ? "s" : ""}.` : `Justifiez ${unjustified} écart${unjustified > 1 ? "s" : ""}.`}
            </p>
          )}
          {confirming ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold">
                Une fois validée, la journée est verrouillée : ses opérations ne pourront plus être annulées, sauf réouverture par le gérant.
              </p>
              <div className="flex gap-3">
                <Button type="button" className="h-12 flex-[2] text-base font-bold" disabled={isPending} onClick={submit}>
                  {isPending ? "Validation…" : "Confirmer la clôture"}
                </Button>
                <Button type="button" variant="outline" className="h-12 flex-1" disabled={isPending} onClick={() => setConfirming(false)}>
                  Retour
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" className="h-14 text-lg font-bold" disabled={!ready || !context.canValidate} onClick={() => setConfirming(true)}>
              <Lock className="size-5" aria-hidden /> Valider et verrouiller la clôture
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
