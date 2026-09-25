"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"

import { FieldError } from "@/components/business/field-error"
import { OperatorTile } from "@/components/business/operator-tile"
import { Button } from "@/components/ui/button"
import type { RoundingMode } from "@/generated/prisma/enums"
import { TRANSACTION_TYPES, TYPE_LABELS } from "@/lib/operation-types"
import { ruleFieldsSchema, type RuleFieldsInput } from "@/schemas/commission-rule"

import { createRuleAction, replaceRuleAction } from "./actions"
import { RuleAmountFields } from "./rule-fields"
import { RulePreview } from "./rule-preview"

export type OperatorOption = { id: string; name: string; color: string | null; logoSrc: string | null }

type RuleFormProps = {
  operators: readonly OperatorOption[]
  roundingMode: RoundingMode
  editing?: { ruleId: string; values: RuleFieldsInput } // absent = new rule
  onDone: () => void
}

function emptyRule(operatorId: string): RuleFieldsInput {
  return {
    operatorId,
    type: "DEPOSIT",
    minAmount: 0,
    maxAmount: 0,
    fixedFee: 0,
    percentage: 0,
    minCommission: null,
    cap: null,
    feeFixed: 0,
    feePercentage: 0,
  }
}

export function RuleForm({ operators, roundingMode, editing, onDone }: RuleFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const form = useForm<RuleFieldsInput>({
    resolver: zodResolver(ruleFieldsSchema),
    defaultValues: editing?.values ?? emptyRule(operators[0]?.id ?? ""),
  })

  const submit = (values: RuleFieldsInput) => {
    setError(null)
    startTransition(async () => {
      const result = editing
        ? await replaceRuleAction({ ruleId: editing.ruleId, rule: values })
        : await createRuleAction(values)
      if (result.ok) onDone()
      else setError(result.error)
    })
  }

  const fixedOperator = operators.find((operator) => operator.id === editing?.values.operatorId)

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-6 rounded-2xl border bg-card p-4">
        <h2 className="font-heading text-xl font-bold">
          {editing
            ? `Modifier : ${fixedOperator?.name ?? "Opérateur"} · ${TYPE_LABELS[editing.values.type]}`
            : "Nouvelle règle"}
        </h2>

        {editing ? (
          <p className="text-sm text-muted-foreground">
            La nouvelle version s&apos;applique aux prochaines opérations. Les opérations déjà saisies gardent leur
            commission.
          </p>
        ) : (
          <>
            <Controller
              control={form.control}
              name="operatorId"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Opérateur">
                  {operators.map((operator) => (
                    <OperatorTile
                      key={operator.id}
                      name={operator.name}
                      color={operator.color}
            logoSrc={operator.logoSrc}
                      selected={field.value === operator.id}
                      onToggle={() => field.onChange(operator.id)}
                    />
                  ))}
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type d'opération">
                  {TRANSACTION_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={field.value === type}
                      variant={field.value === type ? "default" : "outline"}
                      className="h-12 text-base"
                      onClick={() => field.onChange(type)}
                    >
                      {TYPE_LABELS[type]}
                    </Button>
                  ))}
                </div>
              )}
            />
            <FieldError message={form.formState.errors.operatorId?.message ?? form.formState.errors.type?.message} />
          </>
        )}

        <RuleAmountFields />
        <RulePreview roundingMode={roundingMode} />

        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" className="h-12 flex-[2] text-base font-bold" disabled={isPending}>
            {isPending ? "Enregistrement…" : editing ? "Enregistrer la nouvelle version" : "Créer la règle"}
          </Button>
          <Button type="button" variant="outline" className="h-12 flex-1" disabled={isPending} onClick={onDone}>
            Annuler
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
