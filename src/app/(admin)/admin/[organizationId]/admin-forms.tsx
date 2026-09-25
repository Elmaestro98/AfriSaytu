import type { ReactNode } from "react"

import type { SubscriptionPlan } from "@/generated/prisma/enums"
import { PAYMENT_PROVIDER_LABELS } from "@/schemas/admin"
import { PLAN_LABELS, PLAN_MONTHLY_PRICE } from "@/server/plans/limits"

import { changePlanAction, extendTrialAction, reactivateAction, recordPaymentAction, suspendAction } from "./actions"
import { SubmitButton } from "../submit-button"

const INPUT = "h-11 w-full rounded-xl border bg-background px-3 text-sm"
const LABEL = "flex flex-col gap-1 text-sm font-semibold"

function Card({ title, action, organizationId, danger, children }: {
  title: string
  action: (form: FormData) => Promise<void>
  organizationId: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <h3 className="font-heading font-bold">{title}</h3>
      <input type="hidden" name="organizationId" value={organizationId} />
      {children}
      <SubmitButton danger={danger} />
    </form>
  )
}

function Reason() {
  return (
    <label className={LABEL}>
      Motif (visible dans le journal du client)
      <input name="reason" required minLength={3} maxLength={300} className={INPUT} />
    </label>
  )
}

type AdminFormsProps = { organizationId: string; plan: SubscriptionPlan | null; suspended: boolean; hasPaid: boolean }

// What the SaaS admin can do on one client. Every rule is checked again on the server.
export function AdminForms({ organizationId, plan, suspended, hasPaid }: AdminFormsProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {!suspended && (
        <Card title="Enregistrer un paiement reçu" action={recordPaymentAction} organizationId={organizationId}>
          <div className="grid grid-cols-2 gap-3">
            <label className={LABEL}>
              Montant (FCFA)
              <input name="amount" type="number" inputMode="numeric" min={1} step={1} required
                defaultValue={plan ? PLAN_MONTHLY_PRICE[plan] : undefined} className={INPUT} />
            </label>
            <label className={LABEL}>
              Nombre de mois
              <input name="months" type="number" inputMode="numeric" min={1} max={24} step={1} defaultValue={1} required className={INPUT} />
            </label>
            <label className={LABEL}>
              Moyen
              <select name="provider" className={INPUT} defaultValue="WAVE">
                {Object.entries(PAYMENT_PROVIDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className={LABEL}>
              Référence (optionnel)
              <input name="providerRef" maxLength={100} className={INPUT} />
            </label>
          </div>
        </Card>
      )}

      {!suspended && !hasPaid && (
        <Card title="Prolonger l'essai" action={extendTrialAction} organizationId={organizationId}>
          <label className={LABEL}>
            Nombre de jours
            <input name="days" type="number" inputMode="numeric" min={1} max={90} step={1} defaultValue={7} required className={INPUT} />
          </label>
          <Reason />
        </Card>
      )}

      <Card title="Changer de formule" action={changePlanAction} organizationId={organizationId}>
        <label className={LABEL}>
          Nouvelle formule
          <select name="plan" className={INPUT} defaultValue={plan ?? "BASIC"}>
            {(Object.keys(PLAN_LABELS) as SubscriptionPlan[]).map((value) => <option key={value} value={value}>{PLAN_LABELS[value]}</option>)}
          </select>
        </label>
        <Reason />
      </Card>

      {suspended ? (
        <Card title="Réactiver le compte" action={reactivateAction} organizationId={organizationId}>
          <p className="text-sm text-muted-foreground">Le statut revient à celui que donnent les dates (essai, actif, grâce ou lecture seule).</p>
          <Reason />
        </Card>
      ) : (
        <Card title="Suspendre le compte" action={suspendAction} organizationId={organizationId} danger>
          <p className="text-sm text-muted-foreground">Plus aucun accès pour le client, aucune donnée supprimée. Réversible.</p>
          <Reason />
        </Card>
      )}
    </section>
  )
}
