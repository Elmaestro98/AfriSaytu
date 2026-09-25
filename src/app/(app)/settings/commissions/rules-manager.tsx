"use client"

import { Plus } from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import type { RoundingMode } from "@/generated/prisma/enums"
import { describeCommission, describeFee, describeRange } from "@/lib/format-rule"
import { TYPE_LABELS } from "@/lib/operation-types"
import { toRuleFields } from "@/schemas/commission-rule"
import type { RuleRow } from "@/server/commissions/manage"

import { closeRuleAction } from "./actions"
import { RuleForm, type OperatorOption } from "./rule-form"

type RulesManagerProps = {
  rules: readonly RuleRow[]
  operators: readonly OperatorOption[]
  roundingMode: RoundingMode
}

type Mode = { kind: "list" } | { kind: "new" } | { kind: "edit"; rule: RuleRow }

function groupByOperatorAndType(rules: readonly RuleRow[]) {
  const groups = new Map<string, { title: string; color: string | null; rules: RuleRow[] }>()
  for (const rule of rules) {
    const key = `${rule.operatorId}:${rule.type}`
    const group = groups.get(key) ?? { title: `${rule.operatorName} · ${TYPE_LABELS[rule.type]}`, color: rule.operatorColor, rules: [] }
    group.rules.push(rule)
    groups.set(key, group)
  }
  return [...groups.entries()]
}

export function RulesManager({ rules, operators, roundingMode }: RulesManagerProps) {
  const [mode, setMode] = useState<Mode>({ kind: "list" })
  const [closingId, setClosingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const back = () => setMode({ kind: "list" })

  if (mode.kind === "new") return <RuleForm operators={operators} roundingMode={roundingMode} onDone={back} />
  if (mode.kind === "edit") {
    const editing = { ruleId: mode.rule.id, values: toRuleFields(mode.rule) }
    return <RuleForm operators={operators} roundingMode={roundingMode} editing={editing} onDone={back} />
  }

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
      {operators.length > 0 ? (
        <Button type="button" className="h-12 text-base font-bold" onClick={() => setMode({ kind: "new" })}>
          <Plus className="size-5" aria-hidden />
          Nouvelle règle
        </Button>
      ) : (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Activez d&apos;abord un opérateur pour créer des règles.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {rules.length === 0 && operators.length > 0 && (
        <p className="rounded-xl border border-dashed p-4 text-muted-foreground">
          Aucune règle pour l&apos;instant. Sans règle, la commission d&apos;une opération vaut 0 et l&apos;opération est
          signalée « sans règle ».
        </p>
      )}

      {groupByOperatorAndType(rules).map(([key, group]) => (
        <section key={key} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
            <span aria-hidden className="size-3 rounded-full bg-primary" style={group.color ? { backgroundColor: group.color } : undefined} />
            {group.title}
          </h2>
          <ul className="flex flex-col gap-3">
            {group.rules.map((rule) => (
              <li key={rule.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
                <p className="font-semibold tabular-nums">{describeRange(rule)}</p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Commission : </span>
                  <span className="font-semibold">{describeCommission(rule)}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Frais client : </span>
                  {describeFee(rule)}
                </p>
                {closingId === rule.id ? (
                  <div className="mt-1 flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      Les prochaines opérations de cette tranche seront « sans règle ».
                    </p>
                    <div className="flex gap-3">
                      <Button type="button" variant="destructive" className="h-11 flex-1" disabled={isPending} onClick={() => close(rule.id)}>
                        Arrêter la règle
                      </Button>
                      <Button type="button" variant="outline" className="h-11 flex-1" disabled={isPending} onClick={() => setClosingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex gap-3">
                    <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setMode({ kind: "edit", rule })}>
                      Modifier
                    </Button>
                    <Button type="button" variant="ghost" className="h-11 flex-1" onClick={() => setClosingId(rule.id)}>
                      Arrêter
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
