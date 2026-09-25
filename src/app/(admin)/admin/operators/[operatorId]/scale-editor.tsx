"use client"

import { Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { AmountInput } from "@/components/business/amount-input"
import { Button } from "@/components/ui/button"
import type { CommissionMode } from "@/generated/prisma/enums"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { Tier } from "@/server/commissions/daily"

import { saveScaleAction } from "./actions"

type Row = { min: number; max: number; open: boolean; commission: number }

const MODES: { value: CommissionMode; title: string; text: string }[] = [
  { value: "DAILY_VOLUME", title: "Sur le volume du jour", text: "Une commission par point de vente et par jour, selon le total des dépôts et retraits (barème ci-dessous)." },
  { value: "PER_TRANSACTION", title: "Par opération", text: "Chaque opération a sa commission, selon les règles saisies par chaque entreprise." },
]

// By default the admin edits the upper bounds and commissions, and every lower bound but the first
// follows the previous upper bound + 1 (no gap). With "Saisir les paliers inférieurs", each lower
// bound is typed as printed by the operator (gaps allowed; the server refuses overlaps).
export function ScaleEditor({ operatorId, mode: initialMode, tiers }: { operatorId: string; mode: CommissionMode; tiers: readonly Tier[] }) {
  const router = useRouter()
  const [mode, setMode] = useState(initialMode)
  const [rows, setRows] = useState<Row[]>(
    tiers.length > 0
      ? tiers.map((tier) => ({ min: tier.minAmount, max: tier.maxAmount ?? 0, open: tier.maxAmount === null, commission: tier.commission }))
      : [{ min: 1, max: 9_999, open: false, commission: 0 }],
  )
  // A saved scale with gaps was typed tier by tier: show it that way.
  const [manualMins, setManualMins] = useState(tiers.some((tier, index) => index > 0 && tier.minAmount !== (tiers[index - 1].maxAmount ?? 0) + 1))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const minOf = (index: number) => (manualMins || index === 0 ? rows[index].min : rows[index - 1].max + 1)
  const toggleManual = (manual: boolean) => {
    // Switching on starts from the bounds shown; switching off goes back to "previous + 1".
    if (manual) setRows((current) => current.map((row, index) => ({ ...row, min: index === 0 ? row.min : current[index - 1].max + 1 })))
    setManualMins(manual)
  }
  const update = (index: number, change: Partial<Row>) => setRows((current) => current.map((row, at) => (at === index ? { ...row, ...change } : row)))
  const add = () =>
    setRows((current) => [...current.map((row) => ({ ...row, open: false })), { min: (current.at(-1)?.max ?? 0) + 1, max: 0, open: true, commission: 0 }])
  const remove = (index: number) => setRows((current) => current.filter((_, at) => at !== index))

  const save = () => {
    setMessage(null)
    const scale: Tier[] = rows.map((row, index) => ({ minAmount: minOf(index), maxAmount: row.open ? null : row.max, commission: row.commission }))
    startTransition(async () => {
      const result = await saveScaleAction({ operatorId, mode, tiers: mode === "DAILY_VOLUME" ? scale : [] })
      setMessage(result.ok
        ? { ok: true, text: "Barème enregistré : il s'applique à partir de maintenant, dans toutes les entreprises." }
        : { ok: false, text: result.error })
      if (result.ok) router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Mode de commission</legend>
        {MODES.map((option) => (
          <label key={option.value} className={cn("flex cursor-pointer gap-3 rounded-2xl border-2 bg-card p-4", mode === option.value ? "border-primary" : "border-border")}>
            <input type="radio" name="mode" className="mt-1 size-4 accent-primary" checked={mode === option.value} onChange={() => setMode(option.value)} />
            <span>
              <span className="block font-semibold">{option.title}</span>
              <span className="block text-sm text-muted-foreground">{option.text}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode === "DAILY_VOLUME" && (
        <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
          <div className="hidden grid-cols-[1fr_1fr_1fr_44px] gap-3 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase sm:grid">
            <span>Palier inférieur</span>
            <span>Palier supérieur</span>
            <span>Commission du jour</span>
            <span />
          </div>
          <ol className="flex flex-col gap-3">
            {rows.map((row, index) => (
              <li key={index} className="grid grid-cols-2 items-center gap-3 rounded-xl bg-muted/50 p-3 sm:grid-cols-[1fr_1fr_1fr_44px] sm:bg-transparent sm:p-0">
                {index === 0 || manualMins ? (
                  <AmountInput aria-label={`Palier ${index + 1}, à partir de`} value={row.min} onValueChange={(min) => update(index, { min })} />
                ) : (
                  <p className="px-3 font-semibold tabular-nums">{formatFCFA(minOf(index))}</p>
                )}
                {row.open ? (
                  <p className="px-3 text-sm font-semibold text-muted-foreground">et plus</p>
                ) : (
                  <AmountInput aria-label={`Palier ${index + 1}, jusqu'à`} value={row.max} onValueChange={(max) => update(index, { max })} />
                )}
                <AmountInput aria-label={`Palier ${index + 1}, commission`} value={row.commission} onValueChange={(commission) => update(index, { commission })} />
                <Button type="button" variant="ghost" size="icon" className="size-11 text-muted-foreground hover:text-destructive" disabled={rows.length === 1}
                  aria-label={`Supprimer le palier ${index + 1}`} onClick={() => remove(index)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
          <label className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
            <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={manualMins} onChange={(event) => toggleManual(event.target.checked)} />
            <span>
              <span className="block font-semibold">Saisir moi-même les paliers inférieurs</span>
              <span className="block text-muted-foreground">
                Pour recopier le barème tel qu&apos;il est publié (ex. 9 995 puis 10 000). Un total qui tombe entre deux paliers compte
                pour le palier inférieur. Les paliers ne doivent pas se chevaucher.
              </span>
            </span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" className="h-11 gap-2 border-dashed" onClick={add}>
              <Plus className="size-4" aria-hidden />
              Ajouter un palier
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" checked={rows.at(-1)?.open ?? false}
                onChange={(event) => update(rows.length - 1, { open: event.target.checked })} />
              Le dernier palier n&apos;a pas de maximum (et plus)
            </label>
          </div>
        </section>
      )}

      <Button type="button" className="h-12 font-bold" disabled={isPending} onClick={save}>
        {isPending ? "Enregistrement…" : "Enregistrer le barème"}
      </Button>
      {message && (
        <p role={message.ok ? "status" : "alert"}
          className={cn("rounded-lg p-3 text-sm font-medium", message.ok ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive")}>
          {message.text}
        </p>
      )}
    </div>
  )
}
