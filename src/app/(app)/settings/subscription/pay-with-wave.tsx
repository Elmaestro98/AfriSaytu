"use client"

import { ExternalLink } from "lucide-react"
import { useState, useTransition } from "react"

import type { SubscriptionPlan } from "@/generated/prisma/enums"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { waveCheckoutUrl } from "@/server/billing/wave"
import { PAYABLE_MONTHS, PLAN_LABELS, subscriptionPrice, type PayableMonths } from "@/server/plans/limits"

import { declarePaymentAction } from "./actions"

const PLANS: readonly SubscriptionPlan[] = ["BASIC", "PRO", "BUSINESS"]
const CHOICE = "h-11 flex-1 rounded-lg px-3 text-sm font-semibold"

// Pay with the SaaS owner's Wave link, then declare the payment with its Wave reference.
// The amount shown is only a guide: the server computes it again from the plan and the months.
export function PayWithWave({ defaultPlan }: { defaultPlan: SubscriptionPlan }) {
  const [plan, setPlan] = useState<SubscriptionPlan>(defaultPlan)
  const [months, setMonths] = useState<PayableMonths>(1)
  const [reference, setReference] = useState("")
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const amount = subscriptionPrice(plan, months)
  const payUrl = waveCheckoutUrl(process.env.NEXT_PUBLIC_WAVE_PAYMENT_URL, amount)

  const declare = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await declarePaymentAction({ plan, months, providerRef: reference })
      setMessage(result.ok ? { ok: true, text: "Merci ! Votre paiement est en attente de confirmation." } : { ok: false, text: result.error })
      if (result.ok) setReference("")
    })
  }

  if (!payUrl) {
    return <p className="rounded-2xl border bg-card p-4 text-sm">Le paiement en ligne n&apos;est pas encore disponible. Contactez le support AfriSaytu pour régler votre abonnement.</p>
  }

  return (
    <section id="payer" className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border-2 border-primary bg-card p-4 lg:p-5">
      <h2 className="font-heading text-lg font-bold">Payer mon abonnement</h2>

      <div role="group" aria-label="Formule" className="flex gap-1 rounded-xl border p-1">
        {PLANS.map((value) => (
          <button key={value} type="button" aria-pressed={plan === value} onClick={() => setPlan(value)}
            className={cn(CHOICE, plan === value ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            {PLAN_LABELS[value]}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Durée" className="flex gap-1 rounded-xl border p-1">
        {PAYABLE_MONTHS.map((value) => (
          <button key={value} type="button" aria-pressed={months === value} onClick={() => setMonths(value)}
            className={cn(CHOICE, months === value ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            {value === 12 ? "1 an" : `${value} mois`}
          </button>
        ))}
      </div>

      <p className="text-center">
        <span className="block font-heading text-3xl font-extrabold tabular-nums">{formatFCFA(amount)}</span>
        {months === 12 && <span className="text-sm text-muted-foreground">2 mois offerts</span>}
      </p>

      <a href={payUrl} target="_blank" rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-accent font-heading text-base font-extrabold text-brand-accent-foreground">
        1. Payer {formatFCFA(amount)} avec Wave <ExternalLink className="size-4" aria-hidden />
      </a>
      <p className="text-sm text-muted-foreground">Si Wave ne remplit pas le montant, saisissez exactement {formatFCFA(amount)}.</p>

      <div className="flex flex-col gap-2 border-t pt-4">
        <label htmlFor="wave-reference" className="text-sm font-semibold">2. Référence de la transaction Wave</label>
        <input id="wave-reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100}
          placeholder="Visible dans l'historique de votre application Wave" className="h-11 rounded-xl border bg-background px-3" />
        <button type="button" onClick={declare} disabled={isPending || reference.trim().length < 4}
          className="h-12 rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-50">
          {isPending ? "Envoi…" : "J'ai payé"}
        </button>
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"}
          className={cn("rounded-lg p-3 text-sm font-medium", message.ok ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive")}>
          {message.text}
        </p>
      )}
    </section>
  )
}
