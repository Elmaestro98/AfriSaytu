"use client"

import { ChevronDown, ClipboardList } from "lucide-react"
import { useState } from "react"

import { AmountInput } from "@/components/business/amount-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Sign } from "@/server/ledger/effects"

export type EntryDetails = {
  customerPhone: string
  reference: string
  note: string
  fee: number | null // null = the rule's fee
  feeInCash: boolean
  commission: number | null // null = the rule's commission
}

type EntryDetailsProps = {
  value: EntryDetails
  onChange: (next: EntryDetails) => void
  computedFee: number
  computedCommission: number
  allowManualCommission: boolean
}

// Optional fields, folded by default so the fast path stays: operator, type, amount, validate.
export function EntryDetailsSection({ value, onChange, computedFee, computedCommission, allowManualCommission }: EntryDetailsProps) {
  const [open, setOpen] = useState(false)
  const set = (patch: Partial<EntryDetails>) => onChange({ ...value, ...patch })

  return (
    <section className="rounded-2xl border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-14 w-full items-center gap-3 px-4 text-left font-semibold"
      >
        <ClipboardList className="size-5 text-muted-foreground" aria-hidden />
        <span className="flex-1">
          Client, référence et frais <span className="font-normal text-muted-foreground">(facultatif)</span>
        </span>
        <ChevronDown className={cn("size-5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-phone">Numéro du client</Label>
            <Input id="entry-phone" inputMode="tel" autoComplete="off" placeholder="77 123 45 67" value={value.customerPhone}
              onChange={(event) => set({ customerPhone: event.target.value })} className="h-12 text-base" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-reference">Référence de l&apos;opérateur</Label>
            <Input id="entry-reference" autoComplete="off" autoCapitalize="characters" value={value.reference}
              onChange={(event) => set({ reference: event.target.value })} className="h-12 text-base" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-fee">Frais payés par le client</Label>
            <AmountInput id="entry-fee" value={value.fee ?? computedFee} onValueChange={(fee) => set({ fee })} />
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-primary" checked={value.feeInCash}
                onChange={(event) => set({ feeInCash: event.target.checked })} />
              Frais payés en espèces
            </label>
          </div>
          {allowManualCommission && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="entry-commission">Commission</Label>
              <AmountInput id="entry-commission" value={value.commission ?? computedCommission}
                onValueChange={(commission) => set({ commission })} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-note">Note</Label>
            <Input id="entry-note" autoComplete="off" value={value.note}
              onChange={(event) => set({ note: event.target.value })} className="h-12 text-base" />
          </div>
        </div>
      )}
    </section>
  )
}

const DIRECTIONS: { sign: Sign; label: string }[] = [
  { sign: 1, label: "Augmente" },
  { sign: -1, label: "Diminue" },
  { sign: 0, label: "Aucun effet" },
]

type DirectionPickerProps = {
  value: { uv: Sign; cash: Sign }
  operatorName: string
  onChange: (next: { uv: Sign; cash: Sign }) => void
}

// "Autre": the agent says how the operation moves each balance.
export function DirectionPicker({ value, operatorName, onChange }: DirectionPickerProps) {
  const row = (key: "uv" | "cash", title: string) => (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={title}>
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {DIRECTIONS.map((direction) => (
          <button key={direction.sign} type="button" role="radio" aria-checked={value[key] === direction.sign}
            onClick={() => onChange({ ...value, [key]: direction.sign })}
            className={cn("h-11 rounded-lg border text-sm font-semibold",
              value[key] === direction.sign ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
            {direction.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <section className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-brand-accent bg-card p-4">
      {row("uv", `Solde ${operatorName}`)}
      {row("cash", "Caisse espèces")}
    </section>
  )
}
