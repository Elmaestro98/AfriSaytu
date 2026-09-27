"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/dates"
import { cn } from "@/lib/utils"
import type { AgentPinRow } from "@/server/devices/queries"

import { resetPinAction } from "./actions"

// Which agents can use a shared phone (they have a code), and the reset of a forgotten code.
export function AgentCodes({ agents }: { agents: readonly AgentPinRow[] }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const reset = (agent: AgentPinRow) =>
    startTransition(async () => {
      setError(null)
      const result = await resetPinAction({ memberId: agent.id })
      setConfirming(null)
      if (!result.ok) return setError(result.error)
      toast.success(`Code de ${agent.name} réinitialisé`, { description: "Il doit en créer un nouveau depuis son compte." })
    })

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Codes des agents</h2>
      {agents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun agent dans vos points de vente.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {agents.map((agent) => (
            <li key={agent.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-semibold">{agent.name}</p>
                <p className={cn("text-xs", agent.lockedUntil ? "font-semibold text-destructive" : agent.hasPin ? "text-primary" : "text-muted-foreground")}>
                  {agent.lockedUntil ? `Bloqué jusqu'à ${formatTime(agent.lockedUntil)} (trop de codes faux)` : agent.hasPin ? "✓ Code créé" : "Pas encore de code"}
                  {" · "}{agent.branchNames.join(", ")}
                </p>
              </div>
              {(agent.hasPin || agent.lockedUntil) && (confirming === agent.id ? (
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" className="h-11" disabled={isPending} onClick={() => reset(agent)}>Réinitialiser</Button>
                  <Button type="button" variant="outline" className="h-11" onClick={() => setConfirming(null)}>Annuler</Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="h-11" onClick={() => setConfirming(agent.id)}>Réinitialiser le code</Button>
              ))}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
    </section>
  )
}
