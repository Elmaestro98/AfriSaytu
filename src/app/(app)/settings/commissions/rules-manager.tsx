"use client"

import { Plus, TriangleAlert } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { RoundingMode } from "@/generated/prisma/enums"
import { formatAmount } from "@/lib/money"
import { TYPE_LABELS } from "@/lib/operation-types"
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query"
import { toRuleFields } from "@/schemas/commission-rule"
import type { RuleRow } from "@/server/commissions/manage"

import { closeRuleAction } from "./actions"
import { RuleForm, type OperatorOption } from "./rule-form"
import { RuleGroups } from "./rule-groups"

type RulesManagerProps = {
  rules: readonly RuleRow[]
  operators: readonly OperatorOption[]
  roundingMode: RoundingMode
}

type Editor = { kind: "new" } | { kind: "edit"; rule: RuleRow } | null

// Commission rules in force: a summary with the "Nouvelle règle" action, the rules grouped by
// operator, and the rule form in a side panel (bottom sheet on a phone), the list staying behind.
export function RulesManager({ rules, operators, roundingMode }: RulesManagerProps) {
  const [editor, setEditor] = useState<Editor>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const desktop = useMediaQuery(DESKTOP_QUERY)

  const covered = new Set(rules.map((rule) => rule.operatorId))
  // Daily-volume operators earn through AfriSaytu's scale, not through the organization's rules.
  const uncovered = operators.filter((operator) => operator.commissionMode !== "DAILY_VOLUME" && !covered.has(operator.id))

  const close = (ruleId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await closeRuleAction({ ruleId })
      if (!result.ok) setError(result.error)
      setClosingId(null)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Synthèse" className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between lg:p-5">
        <div className="grid grid-cols-2 gap-4 lg:gap-10">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tranches en vigueur</p>
            <p className="font-heading text-xl font-extrabold tabular-nums">{formatAmount(rules.length)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Opérateurs couverts</p>
            <p className="font-heading text-xl font-extrabold tabular-nums">
              {formatAmount(operators.length - uncovered.length)} <span className="text-base font-semibold text-muted-foreground">/ {formatAmount(operators.length)}</span>
            </p>
          </div>
        </div>
        {operators.length > 0 ? (
          <Button type="button" className="h-11 gap-2 px-4 font-bold" onClick={() => setEditor({ kind: "new" })}>
            <Plus className="size-5" aria-hidden />
            Nouvelle règle
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Activez d&apos;abord un opérateur pour créer des règles.</p>
        )}
      </section>

      {uncovered.length > 0 && rules.length > 0 && (
        <p className="flex items-start gap-2 rounded-xl bg-brand-accent/15 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-brand-accent-strong" aria-hidden />
          <span>
            <span className="font-semibold">{uncovered.map((operator) => operator.name).join(", ")}</span> n&apos;
            {uncovered.length > 1 ? "ont" : "a"} aucune règle : leurs opérations auront une commission de 0 et seront signalées « sans règle ».
          </span>
        </p>
      )}

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}

      {rules.length === 0 ? (
        operators.length > 0 && (
          <div className="rounded-2xl border border-dashed p-6 text-center">
            <p className="font-semibold">Aucune règle pour l&apos;instant.</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Sans règle, la commission d&apos;une opération vaut 0 et l&apos;opération est signalée « sans règle ». Créez une règle par
              opérateur, type d&apos;opération et tranche de montant.
            </p>
          </div>
        )
      ) : (
        <RuleGroups rules={rules} closingId={closingId} isPending={isPending}
          onEdit={(rule) => setEditor({ kind: "edit", rule })} onAskClose={setClosingId} onClose={close} />
      )}

      <Sheet open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <SheetContent side={desktop ? "right" : "bottom"}
          className="max-h-[92svh] overflow-y-auto rounded-t-2xl lg:max-h-none lg:w-full lg:max-w-lg lg:rounded-none">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl font-bold">
              {editor?.kind === "edit" ? `${editor.rule.operatorName} · ${TYPE_LABELS[editor.rule.type]}` : "Nouvelle règle"}
            </SheetTitle>
            <SheetDescription>
              {editor?.kind === "edit"
                ? "La nouvelle version s'applique aux prochaines opérations."
                : "Une commission par opérateur, type d'opération et tranche de montant."}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {editor?.kind === "new" && <RuleForm operators={operators} roundingMode={roundingMode} onDone={() => setEditor(null)} />}
            {editor?.kind === "edit" && (
              <RuleForm key={editor.rule.id} operators={operators} roundingMode={roundingMode}
                editing={{ ruleId: editor.rule.id, values: toRuleFields(editor.rule) }} onDone={() => setEditor(null)} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
