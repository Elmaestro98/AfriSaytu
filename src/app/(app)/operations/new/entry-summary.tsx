import { CircleAlert, Coins, Wallet } from "lucide-react"

import { formatFCFA } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { EntryResult } from "@/server/operations/compute-entry"

type EntrySummaryProps = {
  result: EntryResult | null
  operatorName: string
  blockNegativeBalance: boolean
}

// What will happen, shown before validation (commission, projected balances, warnings).
export function EntrySummary({ result, operatorName, blockNegativeBalance }: EntrySummaryProps) {
  if (!result) {
    return <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Saisissez un montant pour voir la commission et les soldes.</p>
  }

  const negativeLabel = result.goesNegative
    .map((account) => (account === "UV" ? `le solde ${operatorName}` : "la caisse"))
    .join(" et ")

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-secondary p-4 text-secondary-foreground" aria-live="polite">
      <p className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm">
          <Coins className="size-4" aria-hidden />
          Commission estimée
        </span>
        {result.quote.noRule && !result.commissionManual ? (
          <span className="text-sm font-semibold text-muted-foreground">Sans règle</span>
        ) : (
          <span className="font-heading text-lg font-bold text-primary tabular-nums">+{formatFCFA(result.commission)}</span>
        )}
      </p>
      {result.fee > 0 && (
        <p className="flex items-center justify-between gap-3 text-sm">
          <span>Frais client</span>
          <span className="font-semibold tabular-nums">{formatFCFA(result.fee)}</span>
        </p>
      )}
      <p className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2">
          <Wallet className="size-4" aria-hidden />
          Solde {operatorName} après
        </span>
        <span className={cn("font-semibold tabular-nums", result.projected.uv < 0 && "text-destructive")}>
          {formatFCFA(result.projected.uv)}
        </span>
      </p>
      <p className="flex items-center justify-between gap-3 text-sm">
        <span>Caisse après</span>
        <span className={cn("font-semibold tabular-nums", result.projected.cash < 0 && "text-destructive")}>
          {formatFCFA(result.projected.cash)}
        </span>
      </p>
      {negativeLabel && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-brand-accent/20 p-2 text-sm font-medium">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {blockNegativeBalance
            ? `Impossible : ${negativeLabel} deviendrait négatif. Approvisionnez d'abord.`
            : `Attention : ${negativeLabel} deviendra négatif.`}
        </p>
      )}
    </section>
  )
}
