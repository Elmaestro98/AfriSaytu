import Link from "next/link"
import { notFound } from "next/navigation"

import { formatDayLabel } from "@/lib/dates"
import { formatAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { getAdminDb } from "@/server/admin/db"
import { AdminAccessError } from "@/server/admin/identity"
import { listPendingPayments } from "@/server/admin/payments"
import { loadAdminOverview } from "@/server/admin/queries"
import { STATUS_LABELS, statusLabel } from "@/server/plans/banner"
import type { SubscriptionState } from "@/server/plans/lifecycle"
import { PLAN_LABELS } from "@/server/plans/limits"

import { PendingPayments } from "./pending-payments"
import { STATUS_TONE } from "./status-tone"

// Clients of the SaaS (F-63): aggregates only, never the detail of their operations.
export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  let admin
  try {
    admin = await getAdminDb()
  } catch (error) {
    if (error instanceof AdminAccessError) notFound()
    throw error
  }
  const now = new Date()
  const [overview, pending, query] = await Promise.all([loadAdminOverview(admin.db, now), listPendingPayments(admin.db), searchParams])
  const ok = typeof query.ok === "string" ? query.ok : null
  const error = typeof query.error === "string" ? query.error : null

  return (
    <>
      {ok && <p role="status" className="rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground">{ok}</p>}
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 font-semibold text-destructive">{error}</p>}
      <PendingPayments payments={pending} returnTo="/admin" showClient />

      <section aria-label="Chiffres globaux" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Clients</p>
          <p className="font-heading text-2xl font-extrabold tabular-nums">{formatAmount(overview.rows.length)}</p>
        </div>
        {(Object.keys(STATUS_LABELS) as SubscriptionState["status"][]).map((status) => (
          <div key={status} className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{STATUS_LABELS[status]}</p>
            <p className="font-heading text-2xl font-extrabold tabular-nums">{formatAmount(overview.byStatus[status])}</p>
          </div>
        ))}
      </section>
      <p className="text-sm text-muted-foreground">
        Revenu mensuel estimé (clients actifs, tarif mensuel) : <span className="font-bold text-foreground">{formatFCFA(overview.monthlyRevenue)}</span>
      </p>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Entreprise</th>
              <th className="px-4 py-3">Formule</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Points de vente</th>
              <th className="px-4 py-3 text-right">Utilisateurs</th>
              <th className="px-4 py-3 text-right">Opérations 30 j</th>
              <th className="px-4 py-3">Dernière activité</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {overview.rows.map((row) => (
              <tr key={row.id} className="hover:bg-accent/50">
                <td className="px-4 py-3">
                  <Link href={`/admin/${row.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">{row.name}</Link>
                </td>
                <td className="px-4 py-3">{row.plan ? PLAN_LABELS[row.plan] : "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap", STATUS_TONE[row.state.status])}>{statusLabel(row.state)}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatAmount(row.branches)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatAmount(row.members)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatAmount(row.operations30d)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{row.lastActivity ? formatDayLabel(row.lastActivity, now) : "Aucune"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {overview.rows.length === 0 && <p className="p-6 text-center text-muted-foreground">Aucun client pour l&apos;instant.</p>}
      </div>
    </>
  )
}
