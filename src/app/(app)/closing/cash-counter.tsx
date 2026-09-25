"use client"

import { ChevronDown } from "lucide-react"
import { useState } from "react"

import { DENOMINATIONS, MAX_PIECES, cashCountTotal, type CashCount, type Denomination } from "@/lib/cash-count"
import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"

type CashCounterProps = {
  value: CashCount
  onChange: (next: CashCount) => void
}

function Row({ denomination, quantity, onQuantity }: { denomination: Denomination; quantity: number; onQuantity: (value: number) => void }) {
  const id = `count-${denomination.key}`
  return (
    <div className="grid grid-cols-[1fr_auto_5.5rem_1fr] items-center gap-2 rounded-xl bg-muted px-3 py-2">
      <label htmlFor={id} className="font-heading font-bold tabular-nums">{denomination.label}</label>
      <span aria-hidden className="text-sm text-muted-foreground">×</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        value={quantity === 0 ? "" : String(quantity)}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 6)
          onQuantity(Math.min(Number(digits || "0"), MAX_PIECES))
        }}
        className="h-11 w-full rounded-lg border bg-card text-center font-heading text-lg font-bold tabular-nums focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      />
      <span className="text-right text-sm font-semibold tabular-nums">{formatFCFA(denomination.value * quantity)}</span>
    </div>
  )
}

// Banknote and coin count of the cash drawer (mockup 05). The total is the counted cash.
export function CashCounter({ value, onChange }: CashCounterProps) {
  const [showCoins, setShowCoins] = useState(DENOMINATIONS.some((item) => item.kind === "PIECE" && (value[item.key] ?? 0) > 0))
  const set = (key: string, quantity: number) => onChange({ ...value, [key]: quantity })
  const notes = DENOMINATIONS.filter((item) => item.kind === "BILLET")
  const coins = DENOMINATIONS.filter((item) => item.kind === "PIECE")
  const coinsTotal = cashCountTotal(Object.fromEntries(coins.map((item) => [item.key, value[item.key] ?? 0])))

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Billets</p>
      {notes.map((item) => (
        <Row key={item.key} denomination={item} quantity={value[item.key] ?? 0} onQuantity={(quantity) => set(item.key, quantity)} />
      ))}

      <button type="button" aria-expanded={showCoins} onClick={() => setShowCoins(!showCoins)}
        className="mt-2 flex min-h-11 items-center justify-between rounded-lg px-1 text-sm font-semibold">
        <span>Pièces {coinsTotal > 0 && <span className="font-normal text-muted-foreground">· {formatFCFA(coinsTotal)}</span>}</span>
        <ChevronDown className={cn("size-5 transition-transform", showCoins && "rotate-180")} aria-hidden />
      </button>
      {showCoins &&
        coins.map((item) => (
          <Row key={item.key} denomination={item} quantity={value[item.key] ?? 0} onQuantity={(quantity) => set(item.key, quantity)} />
        ))}
    </div>
  )
}
