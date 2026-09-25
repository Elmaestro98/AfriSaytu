import { Activity, Coins, Receipt, TrendingUp } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { KpiCard } from "@/components/business/dashboard/kpi-card"
import { PAGE } from "@/lib/layout"
import { formatAmount, formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { StatsAccessError, loadStats } from "@/server/stats/load"
import { SUPERVISION_PERIODS, SUPERVISION_PERIOD_LABELS, type SupervisionPeriod } from "@/server/supervision/compute"

import { AgentRanking, OperatorBreakdown, TypeBreakdown } from "./breakdowns"
import { DailyChart } from "./daily-chart"

const COMPARED_TO: Record<SupervisionPeriod, string> = { today: "vs hier", "7d": "vs 7 jours avant", month: "vs mois précédent" }

// Statistics (F-52): day / week / month, split by operator, type and agent, compared with the
// previous period. Everyone sees only what they may see: an agent, their own operations.
export default async function StatsPage({ searchParams }: PageProps<"/stats">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }

  const params = await searchParams
  const period = SUPERVISION_PERIODS.find((item) => item === params.period) ?? "today"
  let stats
  try {
    stats = await loadStats(ctx, period, new Date())
  } catch (error) {
    if (error instanceof StatsAccessError) redirect("/dashboard")
    throw error
  }
  const isAgent = ctx.actor.role === "AGENT"
  const comparedTo = COMPARED_TO[period]

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Statistiques" subtitle={isAgent ? "Vos opérations" : "Opérations validées"} />
      <main className={cn(PAGE, "gap-6")}>
        {!isAgent && (
          <Link href="/stats/reconciliation"
            className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 font-semibold hover:bg-accent lg:self-start">
            Rapprochement des commissions
            <span className="text-sm font-normal text-muted-foreground">Estimées / reçues des opérateurs, par mois</span>
          </Link>
        )}
        <nav aria-label="Période" className="flex gap-1 rounded-xl border bg-card p-1 lg:self-end">
          {SUPERVISION_PERIODS.map((value) => (
            <Link key={value} href={value === "today" ? "/stats" : `/stats?period=${value}`} aria-current={value === period ? "page" : undefined} scroll={false}
              className={cn("flex h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap",
                value === period ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
              {SUPERVISION_PERIOD_LABELS[value]}
            </Link>
          ))}
        </nav>

        <section aria-label="Indicateurs" className="grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-4">
          <KpiCard label={isAgent && stats.dailyCommission === 0 ? "Mes commissions" : "Commissions"} value={`+${formatFCFA(stats.commission)}`} icon={Coins} tone="primary"
            change={{ value: stats.commissionChange, label: comparedTo }} />
          <KpiCard label="Volume" value={formatFCFA(stats.volume)} icon={TrendingUp}
            change={{ value: stats.volumeChange, label: comparedTo }} />
          <KpiCard label="Opérations" value={formatAmount(stats.count)} icon={Activity}
            change={{ value: stats.countChange, label: comparedTo }} />
          <KpiCard label="Commission moyenne" value={formatFCFA(stats.averageCommission)} icon={Receipt}>
            <span className="text-xs text-muted-foreground">par opération</span>
          </KpiCard>
        </section>

        {stats.dailyCommission > 0 && (
          <p className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            Dont <span className="font-bold">{formatFCFA(stats.dailyCommission)}</span> de commissions sur le volume du jour
            {isAgent ? " de votre point de vente (tous agents confondus)" : ""}. Elles appartiennent au point de vente : les répartitions par type
            {isAgent ? "" : " et par agent"} ci-dessous ne les incluent pas.
          </p>
        )}

        <DailyChart days={stats.daily} />

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <OperatorBreakdown operators={stats.operators} />
          <TypeBreakdown types={stats.types} />
        </div>

        {stats.agents && <AgentRanking agents={stats.agents} />}
      </main>
    </div>
  )
}
