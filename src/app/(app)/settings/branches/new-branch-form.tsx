"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { useState, useTransition } from "react"
import { FormProvider, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { createBranchSchema, type CreateBranchInput } from "@/schemas/settings"
import type { ActiveOperator } from "@/server/onboarding/queries"

// The same form steps as the onboarding: the field names are identical.
import { CashStep } from "../../onboarding/steps-cash"
import { BranchStep } from "../../onboarding/steps-basic"
import { OperatorsStep } from "../../onboarding/steps-operators"
import { createBranchAction } from "./actions"

const EMPTY: CreateBranchInput = {
  branchName: "",
  branchAddress: "",
  operators: [],
  cash: { openingBalance: 0, alertThreshold: 0 },
}

export function NewBranchForm({ operators }: { operators: readonly ActiveOperator[] }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const form = useForm<CreateBranchInput>({ resolver: zodResolver(createBranchSchema), defaultValues: EMPTY })

  if (!open) {
    return (
      <Button type="button" className="h-12 w-full text-base font-bold" onClick={() => setOpen(true)}>
        <Plus className="size-5" aria-hidden />
        Nouveau point de vente
      </Button>
    )
  }

  const submit = (values: CreateBranchInput) => {
    setError(null)
    startTransition(async () => {
      const result = await createBranchAction(values)
      if (result.ok) {
        form.reset(EMPTY)
        setOpen(false)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-6 rounded-2xl border bg-card p-4">
        <h2 className="font-heading text-xl font-bold">Nouveau point de vente</h2>
        <BranchStep />
        <OperatorsStep catalog={operators} />
        <CashStep catalog={operators} />
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <Button type="submit" className="h-12 flex-[2] text-base font-bold" disabled={isPending}>
            {isPending ? "Création…" : "Créer le point de vente"}
          </Button>
          <Button type="button" variant="outline" className="h-12 flex-1" disabled={isPending} onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
