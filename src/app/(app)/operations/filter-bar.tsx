"use client"

import { ChevronDown, LoaderCircle, Search, X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { dayKey } from "@/lib/dates"
import {
  DEFAULT_FILTERS,
  MAX_RANGE_DAYS,
  PAGE_SIZE,
  PERIODS,
  PERIOD_LABELS,
  historyQueryString,
  parseRange,
  type HistoryFilters,
} from "@/lib/history-filters"
import { TRANSACTION_TYPES, TYPE_LABELS } from "@/lib/operation-types"
import { cn } from "@/lib/utils"
import type { HistoryOptions } from "@/server/operations/history"

const SEARCH_DELAY_MS = 400
const CUSTOM = "custom"
const DAY_MS = 24 * 60 * 60 * 1000

type Choice = { value: string; label: string }

function FilterSelect({ label, value, choices, allLabel, onChange }: {
  label: string
  value: string | null
  choices: readonly Choice[]
  allLabel?: string
  onChange: (value: string | null) => void
}) {
  const active = value !== null
  return (
    <label className="relative shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className={cn(
          "h-11 cursor-pointer appearance-none rounded-full border pr-9 pl-4 text-sm font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active ? "border-primary bg-primary text-primary-foreground" : "bg-card",
        )}
      >
        {allLabel && <option value="">{allLabel}</option>}
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>{choice.label}</option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
    </label>
  )
}

// Search and filters of the history (mockup 06). Every change updates the page address.
export function FilterBar({ filters, options }: { filters: HistoryFilters; options: HistoryOptions }) {
  const router = useRouter()
  const pathname = usePathname()
  const [text, setText] = useState(filters.q)
  const [isPending, startTransition] = useTransition()
  // "Période personnalisée": two days, applied together. Default: the last 7 days.
  const [today] = useState(() => dayKey(new Date()))
  const [showRange, setShowRange] = useState(filters.range !== null)
  const [from, setFrom] = useState(() => filters.range?.from ?? dayKey(new Date(Date.now() - 6 * DAY_MS)))
  const [to, setTo] = useState(() => filters.range?.to ?? today)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const applyRange = () => {
    const range = parseRange(from, to)
    if (!range) return setRangeError(`Choisissez deux dates valides, sur ${MAX_RANGE_DAYS} jours au plus.`)
    setRangeError(null)
    apply({ range })
  }

  // A transition keeps the current results on screen while the new ones load (no blank page,
  // and the search field keeps the focus).
  const apply = (patch: Partial<HistoryFilters>) =>
    startTransition(() => router.replace(`${pathname}${historyQueryString({ ...filters, ...patch, limit: PAGE_SIZE })}`, { scroll: false }))

  useEffect(() => {
    if (text.trim() === filters.q) return
    const timer = setTimeout(() => apply({ q: text.trim() }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new text should trigger a search
  }, [text])

  const hasFilters = historyQueryString({ ...filters, limit: PAGE_SIZE }) !== ""

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="N° client, référence ou montant"
          aria-label="Rechercher une opération"
          className="h-12 w-full rounded-2xl border bg-card pr-12 pl-12 text-base focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        />
        {isPending ? (
          <LoaderCircle aria-label="Recherche en cours" className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : text ? (
          <button type="button" aria-label="Effacer la recherche" onClick={() => setText("")}
            className="absolute top-1/2 right-1 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted">
            <X className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>

      {showRange && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Du
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)}
              className="h-11 rounded-xl border bg-background px-3 text-base" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Au
            <input type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)}
              className="h-11 rounded-xl border bg-background px-3 text-base" />
          </label>
          <button type="button" onClick={applyRange} className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
            Appliquer
          </button>
          {rangeError && <p role="alert" className="w-full text-sm font-medium text-destructive">{rangeError}</p>}
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        <FilterSelect label="Période" value={showRange ? CUSTOM : filters.period === DEFAULT_FILTERS.period ? null : filters.period}
          choices={[
            ...PERIODS.filter((period) => period !== DEFAULT_FILTERS.period).map((period) => ({ value: period, label: PERIOD_LABELS[period] })),
            { value: CUSTOM, label: "Période personnalisée…" },
          ]}
          allLabel={PERIOD_LABELS[DEFAULT_FILTERS.period]}
          onChange={(value) => {
            if (value === CUSTOM) return setShowRange(true)
            setShowRange(false)
            apply({ period: (value as HistoryFilters["period"]) ?? DEFAULT_FILTERS.period, range: null })
          }} />
        <FilterSelect label="Opérateur" value={filters.operator} allLabel="Tous opérateurs"
          choices={options.operators.map((operator) => ({ value: operator.id, label: operator.name }))} onChange={(operator) => apply({ operator })} />
        <FilterSelect label="Type" value={filters.type} allLabel="Tous types"
          choices={TRANSACTION_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))} onChange={(type) => apply({ type: type as HistoryFilters["type"] })} />
        <FilterSelect label="Statut" value={filters.status} allLabel="Tous statuts"
          choices={[{ value: "VALID", label: "Validées" }, { value: "CANCELLED", label: "Annulées" }]} onChange={(status) => apply({ status: status as HistoryFilters["status"] })} />
        {options.branches.length > 0 && (
          <FilterSelect label="Point de vente" value={filters.branch} allLabel="Tous points de vente"
            choices={options.branches.map((branch) => ({ value: branch.id, label: branch.name }))} onChange={(branch) => apply({ branch })} />
        )}
        {options.agents.length > 0 && (
          <FilterSelect label="Agent" value={filters.agent} allLabel="Tous agents"
            choices={options.agents.map((agent) => ({ value: agent.id, label: agent.name }))} onChange={(agent) => apply({ agent })} />
        )}
        {hasFilters && (
          <button type="button" onClick={() => { setText(""); setShowRange(false); startTransition(() => router.replace(pathname, { scroll: false })) }}
            className="h-11 shrink-0 rounded-full px-4 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Tout effacer
          </button>
        )}
      </div>
    </div>
  )
}
