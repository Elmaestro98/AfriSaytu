"use client"

import { useOrganizationList } from "@clerk/nextjs"
import { zodResolver } from "@hookform/resolvers/zod"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { FormProvider, useForm, type FieldPath } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { onboardingSchema, type OnboardingInput } from "@/schemas/onboarding"
import type { ActiveOperator } from "@/server/onboarding/queries"

import { completeOnboarding } from "./actions"
import { CashStep } from "./steps-cash"
import { BranchStep, CompanyStep } from "./steps-basic"
import { OperatorsStep } from "./steps-operators"

const STEP_TITLES = ["Votre entreprise", "Point de vente", "Opérateurs", "Caisse et récapitulatif"]

// Fields checked before moving on from each step.
const STEP_FIELDS: FieldPath<OnboardingInput>[][] = [
  ["organizationName"],
  ["branchName", "branchAddress"],
  ["operators"],
  ["cash"],
]

const LAST_STEP = STEP_TITLES.length - 1

export function OnboardingWizard({ operators }: { operators: readonly ActiveOperator[] }) {
  const router = useRouter()
  const { setActive } = useOrganizationList()
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    mode: "onTouched",
    defaultValues: {
      organizationName: "",
      branchName: "",
      branchAddress: "",
      operators: [],
      cash: { openingBalance: 0, alertThreshold: 0 },
    },
  })

  const goNext = async () => {
    const valid = await form.trigger(STEP_FIELDS[step])
    if (valid) setStep((current) => Math.min(current + 1, LAST_STEP))
  }

  const submit = (values: OnboardingInput) => {
    setServerError(null)
    startTransition(async () => {
      const result = await completeOnboarding(values)
      if (!result.ok) {
        setServerError(result.error)
        return
      }
      // Make the new organization the active one in the Clerk session, then enter the app.
      await setActive?.({ organization: result.clerkOrgId })
      router.replace("/dashboard")
      router.refresh()
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="AfriSaytu" width={408} height={612} className="h-12 w-auto" />
          <div>
            <p className="text-sm text-muted-foreground">
              Étape {step + 1} sur {STEP_TITLES.length}
            </p>
            <h1 className="text-xl font-bold text-primary">{STEP_TITLES[step]}</h1>
          </div>
        </div>
        <Progress value={((step + 1) / STEP_TITLES.length) * 100} aria-label="Progression" />
      </header>

      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-1 flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault()
            // Enter must never submit early: only the last step sends the form.
            if (step < LAST_STEP) void goNext()
            else void form.handleSubmit(submit)(event)
          }}
        >
          <div className="flex-1">
            {step === 0 && <CompanyStep />}
            {step === 1 && <BranchStep />}
            {step === 2 && <OperatorsStep catalog={operators} />}
            {step === 3 && <CashStep catalog={operators} />}
          </div>

          {serverError && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {serverError}
            </p>
          )}

          <div className="flex gap-3">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 text-base"
                disabled={isPending}
                onClick={() => setStep((current) => current - 1)}
              >
                Retour
              </Button>
            )}
            <Button type="submit" className="h-12 flex-1 text-base" disabled={isPending}>
              {step < LAST_STEP ? "Continuer" : isPending ? "Création…" : "Terminer"}
            </Button>
          </div>
        </form>
      </FormProvider>
    </main>
  )
}
