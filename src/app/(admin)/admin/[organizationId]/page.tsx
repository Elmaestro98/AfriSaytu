import Link from "next/link"
import { notFound } from "next/navigation"

import { formatDayLabel, formatLongDate } from "@/lib/dates"
import { formatAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { PAYMENT_PROVIDER_LABELS } from "@/schemas/admin"
import { getAdminDb } from "@/server/admin/db"
import { AdminAccessError } from "@/server/admin/identity"
import { loadAdminOrganization } from "@/server/admin/queries"
import { STATUS_LABELS, deadlineLine, statusLabel } from "@/server/plans/banner"
import { PLAN_LABELS } from "@/server/plans/limits"

import { STATUS_TONE } from "../status-tone"
import { AdminForms } from "./admin-forms"

function providerLabel(provider: string): string {
  return Object.hasOwn(PAYMENT_PROVIDER_LABELS, provider) ? PAYMENT_PROVIDER_LABELS[provider as keyof typeof PAYMENT_PROVIDER_LABELS] : provider
}

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null
}

// One client of the SaaS: subscription, usage, payments, and the admin actions (F-63).
export default async function AdminOrganizationPage({ params, searchParams }: PageProps<"/admin/[organizationId]">) {
  let admin
  try {
    admin = await getAdminDb()
  } catch (error) {
    if (error instanceof AdminAccessError) notFound()
    throw error
  }
  const { organizationId } = await params
  const query = await searchParams
  const now = new Date()
  const detail = await loadAdminOrganization(admin.db, organizationId, now)
  if (!detail) notFound()

  const stored = detail.subscriptions[0]
  const deadline = deadlineLine(detail.state, formatLongDate)
  const ok = first(query.ok)
  const error = first(query.error)

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-sm font-semibold text-primary">← Tous les clients</Link>
        <h1 className="font-heading text-3xl font-extrabold">{detail.name}</h1>
        <p className="text-sm text-muted-foreground">
          Client depuis le {formatLongDate(detail.createdAt)}
          {detail.owner && ` · Propriétaire : ${detail.owner.name}`}
          {(detail.owner?.phone ?? detail.phone) && ` · ${detail.owner?.phone ?? detail.phone}`}
          {detail.email && ` · ${detail.email}`}
        </p>
      </div>

      {ok && <p role="status" className="rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground">{ok}</p>}
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 font-semibold text-destructive">{error}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Statut</p>
          <span className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-sm font-bold", STATUS_TONE[detail.state.status])}>{statusLabel(detail.state)}</span>
          {deadline && <p className="mt-1 text-sm">{deadline}</p>}
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Formule</p>
          <p className="font-heading text-xl font-bold">{detail.plan ? PLAN_LABELS[detail.plan] : "—"}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Utilisation</p>
          <p className="text-sm tabular-nums">{formatAmount(detail.branches)} point(s) de vente · {formatAmount(detail.members)} utilisateur(s)</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Activité</p>
          <p className="text-sm tabular-nums">{formatAmount(detail.operations30d)} opérations en 30 jours</p>
          <p className="text-sm text-muted-foreground">Dernière : {detail.lastActivity ? formatDayLabel(detail.lastActivity, now) : "aucune"}</p>
        </div>
      </section>

      <AdminForms organizationId={detail.id} plan={detail.plan}
        suspended={stored?.status === "SUSPENDED" || stored?.status === "READ_ONLY"} hasPaid={Boolean(stored?.currentPeriodEnd)} />

      <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-bold">Paiements</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {detail.payments.length === 0 && <li className="p-4 text-sm text-muted-foreground">Aucun paiement enregistré.</li>}
            {detail.payments.map((payment) => (
              <li key={payment.id} className="flex justify-between gap-3 p-4 text-sm">
                <span>
                  <span className="block font-semibold">{formatLongDate(payment.createdAt)}</span>
                  <span className="text-muted-foreground">{providerLabel(payment.provider)}{payment.providerRef && ` · ${payment.providerRef}`}</span>
                </span>
                <span className="font-bold tabular-nums">{formatFCFA(payment.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-lg font-bold">Historique de l&apos;abonnement</h2>
          <ul className="divide-y rounded-2xl border bg-card">
            {detail.subscriptions.map((row) => (
              <li key={row.id} className="flex flex-col gap-0.5 p-4 text-sm">
                <span className="font-semibold">{formatLongDate(row.createdAt)} · {PLAN_LABELS[row.plan]} · {STATUS_LABELS[row.status]}</span>
                <span className="text-muted-foreground">
                  {row.trialEndsAt && `Fin d'essai : ${formatLongDate(row.trialEndsAt)}`}
                  {row.trialEndsAt && row.currentPeriodEnd && " · "}
                  {row.currentPeriodEnd && `Payé jusqu'au ${formatLongDate(row.currentPeriodEnd)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
