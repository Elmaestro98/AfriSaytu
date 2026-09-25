import { ChevronDown, Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { dayKey, formatDayKey, formatDayLabel, formatLongDate } from "@/lib/dates"
import { PAGE_SIZE, PERIOD_LABELS, historyQueryString, parseHistoryFilters } from "@/lib/history-filters"
import { PAGE } from "@/lib/layout"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { canExportOperations } from "@/server/export/operations"
import { loadHistoryOptions, searchHistory } from "@/server/operations/history"
import type { OperationRow } from "@/server/operations/queries"

import { ExportLinks } from "./export-links"
import { FilterBar } from "./filter-bar"
import { OperationItem } from "./operation-item"
import { OperationsTable } from "./operations-table"

function groupByDay(operations: readonly OperationRow[]) {
  const groups = new Map<string, OperationRow[]>()
  for (const operation of operations) {
    const key = dayKey(operation.createdAt)
    groups.set(key, [...(groups.get(key) ?? []), operation])
  }
  return [...groups.values()]
}

// History of operations (mockup 06, F-50): search, filters, day groups, load more.
export default async function HistoryPage({ searchParams }: PageProps<"/operations">) {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  if (!authorize(ctx.actor, "transaction:view").allowed) redirect("/dashboard")

  const now = new Date()
  const filters = parseHistoryFilters(await searchParams)
  const [result, options, canExport] = await Promise.all([searchHistory(ctx, filters, now), loadHistoryOptions(ctx), canExportOperations(ctx)])
  const canEnter = authorize(ctx.actor, "transaction:create").allowed
  const mayExport = authorize(ctx.actor, "data:export").allowed // the right; canExport adds the plan
  const periodLabel = filters.range ? `Du ${formatDayKey(filters.range.from)} au ${formatDayKey(filters.range.to)}` : PERIOD_LABELS[filters.period]
  const showAuthor = ctx.actor.role !== "AGENT"
  const { summary } = result

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Historique" subtitle={ctx.actor.role === "AGENT" ? "Vos opérations" : periodLabel} />
      <main className={cn(PAGE, "gap-5")}>
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:flex-row lg:items-end lg:justify-between lg:p-5">
          <div>
            <p className="text-sm text-muted-foreground">
              Volume filtré · {summary.validCount} opération{summary.validCount > 1 ? "s" : ""} validée{summary.validCount > 1 ? "s" : ""}
            </p>
            <p className="font-heading text-3xl font-extrabold tabular-nums">{formatFCFA(summary.volume)}</p>
          </div>
          <div className="lg:text-right">
            <p className="text-sm text-muted-foreground">Commissions</p>
            <p className="font-heading text-xl font-bold text-primary tabular-nums">+{formatFCFA(summary.commission)}</p>
          </div>
        </section>

        <FilterBar key={historyQueryString(filters)} filters={filters} options={options} />

        {/* F-61: a plan limit invites to upgrade instead of hiding data silently. */}
        {result.retention && (filters.range ? filters.range.from < dayKey(result.retention.since) : filters.period === "all") && (
          <p className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            Votre formule {result.retention.planLabel} affiche les {result.retention.months} derniers mois (depuis le {formatLongDate(result.retention.since)}).
            Les opérations plus anciennes sont conservées.{" "}
            {ctx.actor.role === "OWNER" ? (
              <Link href="/settings/subscription" className="font-semibold underline underline-offset-4">Passer à une formule supérieure</Link>
            ) : (
              "Le propriétaire peut passer à une formule supérieure pour les revoir."
            )}
          </p>
        )}

        {canExport && result.rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              L&apos;export contient les opérations affichées par les filtres ci-dessus ({periodLabel.toLowerCase()}).
            </p>
            <ExportLinks filters={filters} />
          </div>
        )}
        {/* F-61: the plan's limit is explained, not hidden. */}
        {!canExport && mayExport && result.rows.length > 0 && (
          <p className="rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
            L&apos;export Excel et CSV est disponible à partir de la formule Pro.{" "}
            {ctx.actor.role === "OWNER" ? (
              <Link href="/settings/subscription" className="font-semibold underline underline-offset-4">Voir les formules</Link>
            ) : (
              "Le propriétaire peut changer de formule."
            )}
          </p>
        )}

        {ctx.actor.role === "AGENT" && (
          <p className="text-sm text-muted-foreground">Vous pouvez annuler vos opérations pendant 15 minutes, avec un motif. Au-delà, demandez au gérant.</p>
        )}

        {result.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-6 text-center">
            <p className="font-semibold">Aucune opération ne correspond.</p>
            {filters.period === "today" && (
              <Link href={`/operations${historyQueryString({ ...filters, period: "7d" })}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                Voir les 7 derniers jours
              </Link>
            )}
            {canEnter && (
              <Link href="/operations/new" className="flex h-12 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
                <Plus className="size-5" aria-hidden /> Saisir une opération
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <OperationsTable operations={result.rows} showAuthor={showAuthor} />
            </div>

            {groupByDay(result.rows).map((group) => {
              const valid = group.filter((operation) => operation.status === "VALID")
              return (
                <section key={dayKey(group[0].createdAt)} className="flex flex-col gap-3 lg:hidden">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-heading text-lg font-bold">{formatDayLabel(group[0].createdAt, now)}</h2>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                      {valid.length} ops · {formatFCFA(valid.reduce((sum, operation) => sum + operation.amount, 0))}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {group.map((operation) => (
                      <OperationItem key={operation.id} operation={operation} showAuthor={showAuthor} />
                    ))}
                  </ul>
                </section>
              )
            })}

            <p className="text-center text-sm text-muted-foreground">
              {result.rows.length} sur {summary.total} opération{summary.total > 1 ? "s" : ""}
            </p>
            {result.hasMore && (
              <Link scroll={false} href={`/operations${historyQueryString({ ...filters, limit: filters.limit + PAGE_SIZE })}`}
                className="flex h-12 items-center justify-center gap-2 self-center rounded-full bg-secondary px-6 font-semibold">
                <ChevronDown className="size-5" aria-hidden /> Charger plus d&apos;historique
              </Link>
            )}
          </>
        )}
      </main>
    </div>
  )
}
