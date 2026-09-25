import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { AUDIT_ACTIONS } from "@/lib/audit-actions"
import { auditQueryString, parseAuditFilters } from "@/lib/audit-filters"
import { PAGE_SIZE, PERIOD_LABELS, PERIODS } from "@/lib/history-filters"
import { PAGE_NARROW } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { AuditAccessError, listAudit } from "@/server/audit/queries"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"

import { AuditList } from "./audit-list"

const SELECT = "h-11 w-full rounded-xl border bg-card px-3 text-sm font-semibold"

// Journal of sensitive actions (F-64): owner and managers. The access is checked on the server,
// in listAudit: an agent typing this address is sent back.
export default async function AuditPage({ searchParams }: PageProps<"/settings/audit">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }

  const filters = parseAuditFilters(await searchParams)
  const now = new Date()
  let audit
  try {
    audit = await listAudit(ctx, filters, now)
  } catch (error) {
    if (error instanceof AuditAccessError) redirect("/dashboard")
    throw error
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Journal d'audit" subtitle="Actions sensibles" backHref="/settings" />
      <main className={cn(PAGE_NARROW, "gap-6")}>
        <form method="get" className="grid gap-2 sm:grid-cols-3" aria-label="Filtres du journal">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Période</span>
            <select name="period" defaultValue={filters.period} className={SELECT}>
              {PERIODS.map((period) => <option key={period} value={period}>{PERIOD_LABELS[period]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Action</span>
            <select name="action" defaultValue={filters.action ?? ""} className={SELECT}>
              <option value="">Toutes</option>
              {Object.entries(AUDIT_ACTIONS).map(([action, label]) => <option key={action} value={action}>{label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Membre</span>
            <select name="member" defaultValue={filters.member ?? ""} className={SELECT}>
              <option value="">Tous</option>
              {audit.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
          <button type="submit" className="h-11 rounded-xl bg-primary font-semibold text-primary-foreground sm:col-span-3">
            Filtrer
          </button>
        </form>

        <AuditList rows={audit.rows} now={now} />

        {audit.hasMore && (
          <Link href={`/settings/audit${auditQueryString({ ...filters, limit: filters.limit + PAGE_SIZE })}`} scroll={false}
            className="flex h-11 items-center justify-center rounded-xl border bg-card font-semibold hover:bg-accent">
            Voir plus
          </Link>
        )}
      </main>
    </div>
  )
}
