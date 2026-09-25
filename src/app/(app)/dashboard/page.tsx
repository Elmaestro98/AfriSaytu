import { auth } from "@clerk/nextjs/server"
import { Activity, ChartColumn, ChartPie, Coins, Landmark, Lock, Plus, Settings, TrendingUp } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { BrandMark } from "@/components/business/brand-mark"
import { AlertsPanel } from "@/components/business/dashboard/alerts-panel"
import { KpiCard } from "@/components/business/dashboard/kpi-card"
import { VolumeBars } from "@/components/business/dashboard/volume-bars"
import { SettingsLink } from "@/components/business/settings-link"
import { formatDayLabel, formatLongDate, formatTime } from "@/lib/dates"
import { PAGE } from "@/lib/layout"
import { formatAmount, formatFCFA } from "@/lib/money"
import { roleLabel } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { requireActor, type ActorContext } from "@/server/auth/actor"
import { authorize, type Action } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { loadDailyCommissions } from "@/server/commissions/daily-summary"
import { getTodaySummary } from "@/server/dashboard/today"
import { isOrganizationProvisioned } from "@/server/onboarding/queries"
import { listRecentOperations } from "@/server/operations/queries"

import { DailyCommissionsPanel } from "./daily-commissions"
import { BalanceCards, RecentOperations } from "./today-sections"

function AccessMessage({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <BrandMark className="size-16 border" />
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      <p className="max-w-sm text-muted-foreground">{text}</p>
    </main>
  )
}

// Home dashboard (mockup 02): the day at a glance, balances, what needs attention.
export default async function DashboardPage() {
  const { orgId } = await auth()

  // No organization yet, or not configured: the setup assistant comes first.
  if (!orgId || !(await isOrganizationProvisioned(orgId))) redirect("/onboarding")

  // Resolves the member. On the first sign-in of an invited person, this creates their profile.
  let ctx: ActorContext
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError && error.code === "MEMBER_DISABLED") {
      return <AccessMessage title="Compte désactivé" text="Votre accès a été désactivé. Contactez le responsable de l'entreprise." />
    }
    if (error instanceof SessionError && error.code === "NOT_A_MEMBER") {
      return <AccessMessage title="Accès non autorisé" text="Vous n'avez pas d'invitation valide pour cette entreprise. Demandez au responsable de vous inviter." />
    }
    throw error
  }

  const now = new Date()
  const can = (action: Action) => authorize(ctx.actor, action).allowed
  const [organization, today, recent, daily] = await Promise.all([
    ctx.db.organization.findFirst({ select: { name: true } }),
    getTodaySummary(ctx, now),
    can("transaction:view") ? listRecentOperations(ctx, 6, now) : Promise.resolve([]),
    loadDailyCommissions(ctx, now),
  ])
  const canEnter = can("transaction:create")
  const canSettings = can("catalog:manage") || can("commissionRule:manage") || can("member:manage")
  const firstName = ctx.memberName.split(" ")[0]

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={organization?.name ?? "AfriSaytu"} subtitle={roleLabel(ctx.actor.role)} />

      <main className={cn(PAGE, "gap-6")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl font-extrabold lg:text-4xl">Bonjour {firstName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{formatLongDate(now)}</span>
              {today.openSince && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                  <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                  Journée ouverte depuis {formatDayLabel(today.openSince, now).toLowerCase()} {formatTime(today.openSince)}
                </span>
              )}
            </div>
          </div>
          {canEnter && (
            <div className="flex gap-2">
              <Link href="/operations/new"
                className="flex h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-brand-accent px-6 font-heading text-lg font-extrabold text-brand-accent-foreground shadow-sm transition-transform active:scale-[0.98] lg:h-12 lg:flex-none lg:text-base">
                <Plus className="size-5" aria-hidden /> Nouvelle opération
              </Link>
              {can("closing:validate") && (
                <Link href="/closing" className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border bg-card px-5 font-semibold hover:bg-accent lg:h-12 lg:flex-none">
                  <Lock className="size-4" aria-hidden /> Clôturer
                </Link>
              )}
            </div>
          )}
        </div>

        <section aria-label={ctx.actor.role === "AGENT" ? "Votre journée" : "Aujourd'hui"} className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
          <KpiCard label="Volume du jour" value={formatFCFA(today.volume)} icon={TrendingUp} tone="primary"
            change={{ value: today.volumeChange, label: "vs hier" }} />
          {/* Per-operation commissions + the day's commissions of daily-volume operators. Yesterday is
              only compared when there is no daily-volume commission (a day in progress vs a full day). */}
          <KpiCard label="Commissions" value={`+${formatFCFA(today.commission + daily.total)}`} icon={Coins}
            change={{ value: daily.rows.length > 0 ? null : today.commissionChange, label: "vs hier" }} />
          <KpiCard label="Opérations" value={String(today.count)} icon={Activity}>
            <span className="text-xs text-muted-foreground">
              {today.deposits} dépôt{today.deposits > 1 ? "s" : ""} · {today.withdrawals} retrait{today.withdrawals > 1 ? "s" : ""}
            </span>
          </KpiCard>
          <KpiCard label="Trésorerie" value={formatFCFA(today.treasury.uv + today.treasury.cash)} icon={Landmark}>
            <span className="text-xs text-muted-foreground tabular-nums">UV {formatAmount(today.treasury.uv)} · Espèces {formatAmount(today.treasury.cash)}</span>
          </KpiCard>
        </section>

        {daily.rows.length > 0 && <DailyCommissionsPanel daily={daily} showBranch={today.showBranch} />}

        <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
          <div className="xl:col-span-2">
            {today.balances.length > 0 && <BalanceCards today={today} canEnter={canEnter} />}
          </div>
          <AlertsPanel alerts={today.alerts} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
          <VolumeBars title="Volume des 7 jours" subtitle={ctx.actor.role === "AGENT" ? "Vos opérations validées" : "Opérations validées"} days={today.daily} />
          {can("transaction:view") && <RecentOperations operations={recent} />}
        </div>

        {(can("transaction:view") || ctx.actor.role !== "AGENT" || canSettings) && (
          <div className="flex flex-col gap-3 lg:hidden">
            {can("transaction:view") && <SettingsLink href="/stats" icon={ChartPie} title="Statistiques"
              description={ctx.actor.role === "AGENT" ? "Vos commissions jour, semaine, mois" : "Commissions par opérateur, type et agent"} />}
            {ctx.actor.role !== "AGENT" && <SettingsLink href="/supervision" icon={ChartColumn} title="Supervision" description="Kiosques, agents et écarts de clôture" />}
            {canSettings && <SettingsLink href="/settings" icon={Settings} title="Réglages" description="Points de vente, opérateurs, commissions, équipe" />}
          </div>
        )}
      </main>
    </div>
  )
}
