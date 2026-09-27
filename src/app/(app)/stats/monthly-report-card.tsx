import { ChevronDown, FileDown } from "lucide-react"

import { formatMonth } from "@/lib/dates"
import type { ReportBranch } from "@/server/reports/monthly"

type MonthlyReportCardProps = {
  months: readonly string[] // newest first, the first one is the current month
  defaultMonth: string
  branches: readonly ReportBranch[] // empty for an agent: their own operations
  isAgent: boolean
}

const SELECT =
  "h-11 w-full cursor-pointer appearance-none rounded-xl border bg-background pr-9 pl-3 text-sm font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// "Rapport mensuel": a plain GET form, no script needed. The server checks the month and the
// branch again (a hidden or edited choice changes nothing).
export function MonthlyReportCard({ months, defaultMonth, branches, isAgent }: MonthlyReportCardProps) {
  return (
    <form action="/api/reports/monthly" method="get" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-end">
      <div className="min-w-0 lg:flex-1">
        <p className="flex items-center gap-2 font-heading text-lg font-bold">
          <FileDown className="size-5 text-primary" aria-hidden /> Rapport mensuel (PDF)
        </p>
        <p className="text-sm text-muted-foreground">
          {isAgent
            ? "Vos chiffres du mois, comparés au mois précédent, et les clôtures de votre point de vente."
            : "Chiffres du mois, opérateurs, clôtures, rapprochement des commissions et agents."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="relative flex flex-col gap-1 text-sm font-medium sm:w-48">
          Mois
          <select name="month" defaultValue={defaultMonth} className={SELECT}>
            {months.map((month, index) => (
              <option key={month} value={month}>
                {capitalized(formatMonth(month))}{index === 0 ? " (en cours)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-3 bottom-3.5 size-4" />
        </label>

        {branches.length > 1 && (
          <label className="relative flex flex-col gap-1 text-sm font-medium sm:w-52">
            Point de vente
            <select name="branch" defaultValue="" className={SELECT}>
              <option value="">Tous les points de vente</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-3 bottom-3.5 size-4" />
          </label>
        )}

        <button type="submit"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold whitespace-nowrap text-primary-foreground hover:bg-primary/90">
          <FileDown className="size-4" aria-hidden /> Télécharger
        </button>
      </div>
    </form>
  )
}
