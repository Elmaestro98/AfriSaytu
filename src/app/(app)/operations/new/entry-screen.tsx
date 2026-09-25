"use client"

import { CircleCheck, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"

import { NumericKeypad } from "@/components/business/numeric-keypad"
import { Button } from "@/components/ui/button"
import type { TransactionType } from "@/generated/prisma/enums"
import { formatAmount, formatFCFA } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import { applyAmountKey } from "@/lib/amount-keys"
import { PAGE } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { newUuid } from "@/lib/uuid"
import { DAILY_VOLUME_TYPES } from "@/server/commissions/daily"
import type { Sign } from "@/server/ledger/effects"
import type { EntryCorrection } from "@/server/operations/correction"
import { computeEntry } from "@/server/operations/compute-entry"
import type { EntryContext } from "@/server/operations/entry-context"

import { createOperationAction } from "./actions"
import { DirectionPicker, EntryDetailsSection, type EntryDetails } from "./entry-details"
import { OperatorPicker, TypePicker } from "./entry-pickers"
import { EntrySummary } from "./entry-summary"
import { useAmountKeyboard } from "./use-amount-keyboard"

const QUICK_AMOUNTS = [5_000, 10_000, 25_000, 50_000]
const NO_DIRECTION = { uv: 0 as Sign, cash: 0 as Sign }

// correction: the cancelled operation being entered again ("Corriger"), to pre-fill the screen.
type Props = { context: EntryContext; branchId: string; correction?: EntryCorrection | null }

export function EntryScreen({ context, branchId, correction = null }: Props) {
  const router = useRouter()
  const branch = context.branches.find((item) => item.id === branchId) ?? context.branches[0]
  const lastOperator = context.last?.branchId === branch.id ? context.last.operatorId : undefined
  const startOperator = correction?.operatorId ?? lastOperator
  const [operatorId, setOperatorId] = useState(branch.operators.find((op) => op.id === startOperator)?.id ?? branch.operators[0]?.id ?? "")
  const [type, setType] = useState<TransactionType>(correction?.type ?? context.last?.type ?? "DEPOSIT")
  const operator = branch.operators.find((item) => item.id === operatorId) ?? branch.operators[0]
  const freshDetails = (nextType: TransactionType, nextOperator = operator): EntryDetails => ({
    customerPhone: "", reference: "", note: "", fee: null, commission: null,
    feeInCash: nextOperator?.effects[nextType].feeInCashDefault ?? false,
  })
  const [amount, setAmount] = useState(correction?.amount ?? 0)
  const [details, setDetails] = useState<EntryDetails>(() =>
    correction
      ? { ...freshDetails(type), customerPhone: correction.customerPhone, reference: correction.reference, note: correction.note, fee: correction.fee, feeInCash: correction.feeInCash }
      : freshDetails(type),
  )
  const [manual, setManual] = useState(NO_DIRECTION)
  const [key, setKey] = useState(() => newUuid())
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string; warning?: string | null } | null>(null)
  const [duplicate, setDuplicate] = useState(false)
  const [isPending, startTransition] = useTransition()

  const result = useMemo(() => {
    if (!operator || amount <= 0) return null
    try {
      return computeEntry(
        { operatorId: operator.id, type, amount, fee: details.fee, commission: details.commission, feeInCash: details.feeInCash, manual: type === "OTHER" ? manual : null },
        { rules: context.rules, roundingMode: context.roundingMode, effect: operator.effects[type], allowManualCommission: context.allowManualCommission, at: new Date(), commissionMode: operator.commissionMode },
        { uvAccountId: operator.uvAccountId, cashAccountId: branch.cashAccountId, uvBalance: operator.uvBalance, cashBalance: branch.cashBalance },
      )
    } catch {
      return null // e.g. "Autre" without a direction yet
    }
  }, [operator, type, amount, details, manual, context, branch])

  // The page only shows this screen for a branch with at least one operator: `operator` exists.

  const choose = (next: { operatorId?: string; type?: TransactionType }) => {
    const nextType = next.type ?? type
    const nextOperator = branch.operators.find((item) => item.id === (next.operatorId ?? operatorId)) ?? operator
    setOperatorId(nextOperator.id)
    setType(nextType)
    setDetails({ ...details, fee: null, commission: null, feeInCash: nextOperator.effects[nextType].feeInCashDefault })
    setDuplicate(false)
  }

  const submit = (confirmDuplicate: boolean) => {
    setFeedback(null)
    startTransition(async () => {
      const response = await createOperationAction({
        idempotencyKey: key, branchId: branch.id, operatorId: operator.id, type, amount, ...details,
        manual: type === "OTHER" ? manual : null, clientCreatedAt: new Date().toISOString(), confirmDuplicate,
      })
      if (response.ok) {
        setFeedback({ kind: "ok", text: response.message, warning: response.warning })
        setAmount(0)
        setDetails(freshDetails(type))
        setManual(NO_DIRECTION)
        setDuplicate(false)
        setKey(newUuid())
        // After a correction, leave its address: the next operation starts empty.
        if (correction) router.replace(`/operations/new?branch=${branch.id}`)
        else router.refresh() // reload balances for the next operation
      } else {
        setDuplicate(response.duplicate === true)
        setFeedback({ kind: "error", text: response.error })
      }
    })
  }

  // Typing the next amount starts a new operation: the previous confirmation goes away.
  const changeAmount = (value: number) => {
    setAmount(value)
    if (feedback?.kind === "ok") setFeedback(null)
  }

  const blocked = context.blockNegativeBalance && (result?.goesNegative.length ?? 0) > 0
  const canSubmit = !isPending && result !== null && !blocked && !duplicate

  useAmountKeyboard(
    (key) => {
      setAmount((previous) => applyAmountKey(previous, key))
      setFeedback((current) => (current?.kind === "ok" ? null : current))
    },
    () => {
      if (canSubmit) submit(false)
    },
  )

  // Phone: one column in the order operator, amount, details, summary, then a sticky button.
  // Desktop: choices on the left; amount, summary and button on the right. The "contents"
  // wrappers let the phone order the items freely while the desktop groups them in columns.
  return (
    <div className={cn(PAGE, "pb-0 lg:pb-8")}>
      {correction && !feedback && (
        <p role="status" className="mb-5 rounded-xl border-2 border-brand-accent bg-brand-accent/10 p-3 text-sm">
          <span className="block font-semibold">Correction de « {correction.label} », annulée{correction.cancelReason ? ` (${correction.cancelReason})` : ""}.</span>
          Les informations sont reprises : corrigez ce qui est faux, puis validez.
        </p>
      )}
      <div className="flex flex-1 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-8">
        <div className="contents lg:flex lg:flex-col lg:gap-5">
          <div className="order-1 flex flex-col gap-5">
            <OperatorPicker operators={branch.operators} value={operator.id} onChange={(id) => choose({ operatorId: id })} />
            <TypePicker value={type} onChange={(nextType) => choose({ type: nextType })} />
            {type === "OTHER" && <DirectionPicker value={manual} operatorName={operator.name} onChange={setManual} />}
          </div>
          <div className="order-3">
            <EntryDetailsSection value={details} onChange={setDetails} computedFee={result?.quote.fee ?? 0}
              computedCommission={result?.quote.commission ?? 0} allowManualCommission={context.allowManualCommission} />
          </div>
        </div>

        <div className="contents lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-4">
          <section className="order-2 flex flex-col gap-3 rounded-2xl border bg-card p-3">
            <div className="flex h-16 items-center justify-between rounded-xl bg-muted px-4">
              <p className={cn("font-heading text-4xl font-extrabold tabular-nums", amount === 0 && "text-muted-foreground")} aria-live="polite">
                {formatAmount(amount)} <span className="text-lg font-bold text-primary">FCFA</span>
              </p>
              {amount > 0 && (
                <button type="button" aria-label="Remettre le montant à zéro" onClick={() => changeAmount(0)} className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-card">
                  <RotateCcw className="size-5" aria-hidden />
                </button>
              )}
            </div>
            <p className="hidden text-xs text-muted-foreground lg:block">
              Tapez le montant au clavier · Retour arrière pour effacer · Entrée pour valider
            </p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((quick) => (
                <button key={quick} type="button" onClick={() => changeAmount(quick)}
                  className={cn("h-11 rounded-lg text-sm font-bold tabular-nums", amount === quick ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                  {formatAmount(quick)}
                </button>
              ))}
            </div>
            <NumericKeypad value={amount} onValueChange={changeAmount} />
          </section>

          <div className="order-4">
            <EntrySummary result={result} operatorName={operator.name} blockNegativeBalance={context.blockNegativeBalance}
              dailyVolume={operator.commissionMode === "DAILY_VOLUME" && DAILY_VOLUME_TYPES.includes(type)} />
          </div>

          <div className="sticky bottom-0 order-5 -mx-4 border-t bg-card/95 p-4 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            {feedback && (
              <div role={feedback.kind === "ok" ? "status" : "alert"}
                className={cn("mb-3 rounded-xl p-3 text-sm font-semibold", feedback.kind === "ok" ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive")}>
                <p className="flex items-start gap-2">
                  {feedback.kind === "ok" && <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />}
                  {feedback.text}
                </p>
                {feedback.warning && <p className="mt-1 font-normal">{feedback.warning}</p>}
                {feedback.kind === "ok" && (
                  <Link href="/operations" className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                    Voir ou annuler
                  </Link>
                )}
                {duplicate && (
                  <div className="mt-3 flex gap-2">
                    <Button type="button" className="h-11 flex-1" disabled={isPending} onClick={() => submit(true)}>Enregistrer quand même</Button>
                    <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => { setDuplicate(false); setFeedback(null) }}>Annuler</Button>
                  </div>
                )}
              </div>
            )}
            <Button type="button" className="h-14 w-full text-lg font-bold" disabled={!canSubmit} onClick={() => submit(false)}>
              {isPending ? "Enregistrement…" : amount > 0 ? `Valider ${TYPE_LABELS[type].toLowerCase()} · ${formatFCFA(amount)}` : "Saisissez un montant"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
