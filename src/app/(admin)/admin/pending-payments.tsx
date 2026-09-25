import Link from "next/link"

import { formatLongDate, formatTime } from "@/lib/dates"
import { formatFCFA } from "@/lib/money"
import type { PendingPayment } from "@/server/admin/payments"
import { PLAN_LABELS } from "@/server/plans/limits"

import { confirmPaymentAction, refusePaymentAction } from "./payment-actions"
import { SubmitButton } from "./submit-button"

function planText(payment: PendingPayment): string {
  const plan = payment.plan && Object.hasOwn(PLAN_LABELS, payment.plan) ? PLAN_LABELS[payment.plan as keyof typeof PLAN_LABELS] : "?"
  return `${plan} · ${payment.months ?? "?"} mois`
}

// Wave payments declared by owners: check the Wave account, then confirm or refuse.
export function PendingPayments({ payments, returnTo, showClient }: { payments: readonly PendingPayment[]; returnTo: string; showClient: boolean }) {
  if (payments.length === 0) return null
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-brand-accent bg-card p-4">
      <div>
        <h2 className="font-heading text-lg font-bold">Paiements Wave à confirmer ({payments.length})</h2>
        <p className="text-sm text-muted-foreground">Vérifiez dans votre application Wave Business que la somme est bien arrivée avec cette référence.</p>
      </div>
      <ul className="flex flex-col divide-y">
        {payments.map((payment) => (
          <li key={payment.id} className="grid gap-3 py-3 lg:grid-cols-[1fr_auto_minmax(0,1.2fr)] lg:items-center">
            <div className="text-sm">
              {showClient && (
                <Link href={`/admin/${payment.organizationId}`} className="font-semibold text-primary underline-offset-4 hover:underline">{payment.organizationName}</Link>
              )}
              <p className="font-heading text-xl font-extrabold tabular-nums">{formatFCFA(payment.amount)}</p>
              <p>{planText(payment)} · Réf. Wave <span className="font-mono font-semibold">{payment.providerRef ?? "—"}</span></p>
              <p className="text-muted-foreground">Déclaré le {formatLongDate(payment.createdAt)} à {formatTime(payment.createdAt)}</p>
            </div>
            <form action={confirmPaymentAction} className="flex">
              <input type="hidden" name="paymentId" value={payment.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <SubmitButton label="Confirmer" />
            </form>
            <form action={refusePaymentAction} className="flex gap-2">
              <input type="hidden" name="paymentId" value={payment.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input name="reason" required minLength={3} maxLength={300} placeholder="Motif du refus"
                className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm" />
              <SubmitButton label="Refuser" danger />
            </form>
          </li>
        ))}
      </ul>
    </section>
  )
}
