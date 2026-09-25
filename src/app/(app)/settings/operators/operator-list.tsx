"use client"

import { useState, useTransition } from "react"

import { OperatorBadge } from "@/components/business/operator-badge"
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

type OperatorCardProps = {
  operator: OrgOperatorRow
  canToggle: boolean
  confirming: boolean
  isPending: boolean
  onConfirm: (confirming: boolean) => void
  onSetActive: (active: boolean) => void
  onError: (message: string | null) => void
}

function OperatorCard({ operator, canToggle, confirming, isPending, onConfirm, onSetActive, onError }: OperatorCardProps) {
  return (
    <li className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs", !operator.isActive && "bg-card/60")}>
      <div className="flex items-center gap-3">
        <OperatorBadge name={operator.name} color={operator.color} logoSrc={operator.logoSrc} className="size-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg font-bold">{operator.name}</p>
          <p className="text-xs text-muted-foreground">{operator.isActive ? "Visible à la saisie" : "Non utilisé par l'entreprise"}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-bold",
          operator.isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
          {operator.isActive ? "Utilisé" : "Disponible"}
        </span>
      </div>

      {canToggle && operator.isActive && <SendFeeSwitch operatorId={operator.operatorId} fromUv={operator.sendFeeFromUv} onError={onError} />}

      {canToggle &&
        (confirming ? (
          <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
            <p className="text-sm">
              {operator.name} n&apos;apparaîtra plus à la saisie. Ses opérations restent dans l&apos;historique.
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="destructive" className="h-11 flex-1" disabled={isPending} onClick={() => onSetActive(false)}>
                Désactiver
              </Button>
              <Button type="button" variant="outline" className="h-11 flex-1 bg-card" disabled={isPending} onClick={() => onConfirm(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : operator.isActive ? (
          <Button type="button" variant="ghost" className="h-11 self-start text-muted-foreground" onClick={() => onConfirm(true)}>
            Ne plus utiliser
          </Button>
        ) : (
          <Button type="button" className="h-11" disabled={isPending} onClick={() => onSetActive(true)}>
            Utiliser cet opérateur
          </Button>
        ))}
    </li>
  )
}

type OperatorListProps = {
  operators: readonly OrgOperatorRow[]
  canToggle: boolean
}

// The global catalogue split in two: the operators the organization uses, and the other ones.
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

  const groups = [
    { title: "Utilisés par l'entreprise", rows: operators.filter((operator) => operator.isActive), empty: "Aucun opérateur activé : activez-en un ci-dessous." },
    { title: "Disponibles", rows: operators.filter((operator) => !operator.isActive), empty: "Tous les opérateurs du catalogue sont utilisés." },
  ]

  return (
    <div className="flex flex-col gap-6">
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}
      {groups.map((group) => (
        <section key={group.title} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {group.title} ({group.rows.length})
          </h2>
          {group.rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{group.empty}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.rows.map((operator) => (
                <OperatorCard key={operator.operatorId} operator={operator} canToggle={canToggle}
                  confirming={confirmingId === operator.operatorId} isPending={isPending}
                  onConfirm={(confirming) => setConfirmingId(confirming ? operator.operatorId : null)}
                  onSetActive={(active) => setActive(operator.operatorId, active)} onError={setError} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
