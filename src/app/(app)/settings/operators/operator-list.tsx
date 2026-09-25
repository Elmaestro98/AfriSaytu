"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { OrgOperatorRow } from "@/server/operators/manage"

import { setOperatorActiveAction, setSendFeeAction } from "./actions"

type SendFeeSwitchProps = {
  operatorId: string
  fromUv: boolean
  onError: (message: string | null) => void
}

// How a SEND moves the UV for this operator: amount only, or amount + customer fee.
function SendFeeSwitch({ operatorId, fromUv, onError }: SendFeeSwitchProps) {
  const [isPending, startTransition] = useTransition()

  const toggle = () => {
    onError(null)
    startTransition(async () => {
      const result = await setSendFeeAction({ operatorId, fromUv: !fromUv })
      if (!result.ok) onError(result.error)
    })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={fromUv}
      disabled={isPending}
      onClick={toggle}
      className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2 text-left disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-semibold">Frais d&apos;envoi prélevés sur l&apos;UV</span>
        <span className="block text-xs text-muted-foreground">
          {fromUv ? "Un envoi retire de l'UV le montant et les frais" : "Un envoi ne retire de l'UV que le montant"}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          fromUv ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
            fromUv ? "left-6" : "left-1",
          )}
        />
      </span>
    </button>
  )
}

type OperatorListProps = {
  operators: readonly OrgOperatorRow[]
  canToggle: boolean
}

export function OperatorList({ operators, canToggle }: OperatorListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const setActive = (operatorId: string, active: boolean) => {
    setError(null)
    startTransition(async () => {
      const result = await setOperatorActiveAction({ operatorId, active })
      if (!result.ok) setError(result.error)
      setConfirmingId(null)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {operators.map((operator) => (
          <li
            key={operator.operatorId}
            className="flex flex-col gap-3 rounded-2xl border border-l-4 bg-card p-4"
            style={operator.color ? { borderLeftColor: operator.color } : undefined}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-xl font-bold">{operator.name}</p>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  operator.isActive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {operator.isActive ? "Activé" : "Désactivé"}
              </span>
            </div>

            {canToggle && operator.isActive && (
              <SendFeeSwitch operatorId={operator.operatorId} fromUv={operator.sendFeeFromUv} onError={setError} />
            )}

            {canToggle &&
              (confirmingId === operator.operatorId ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    {operator.name} n&apos;apparaîtra plus à la saisie. Ses opérations restent dans
                    l&apos;historique.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-11 flex-1"
                      disabled={isPending}
                      onClick={() => setActive(operator.operatorId, false)}
                    >
                      Désactiver
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1"
                      disabled={isPending}
                      onClick={() => setConfirmingId(null)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : operator.isActive ? (
                <Button type="button" variant="outline" className="h-11" onClick={() => setConfirmingId(operator.operatorId)}>
                  Désactiver
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11"
                  disabled={isPending}
                  onClick={() => setActive(operator.operatorId, true)}
                >
                  Activer
                </Button>
              ))}
          </li>
        ))}
      </ul>
    </div>
  )
}
