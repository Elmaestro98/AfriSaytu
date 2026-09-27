"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"

import { setMutedAction } from "./actions"

type KindRow = { kind: string; label: string; description: string; muted: boolean }

// One switch per kind of notification the member's role may receive.
export function NotificationKinds({ kinds }: { kinds: readonly KindRow[] }) {
  const [muted, setMuted] = useState(() => new Set(kinds.filter((row) => row.muted).map((row) => row.kind)))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const toggle = (kind: string) => {
    const next = !muted.has(kind)
    setError(null)
    setMuted((current) => {
      const copy = new Set(current)
      if (next) copy.add(kind)
      else copy.delete(kind)
      return copy
    })
    startTransition(async () => {
      const result = await setMutedAction({ kind, muted: next })
      if (!result.ok) {
        setError(result.error)
        setMuted((current) => {
          const copy = new Set(current)
          if (next) copy.delete(kind)
          else copy.add(kind)
          return copy
        })
      } else {
        const label = kinds.find((row) => row.kind === kind)?.label ?? "Notification"
        toast.success(`Notification « ${label} » ${next ? "désactivée" : "activée"}`)
      }
    })
  }

  return (
    <section aria-labelledby="kinds-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <h2 id="kinds-title" className="font-heading text-lg font-bold">Ce que je reçois</h2>
      <ul className="flex flex-col gap-2">
        {kinds.map((row) => {
          const on = !muted.has(row.kind)
          return (
            <li key={row.kind}>
              <button type="button" role="switch" aria-checked={on} disabled={isPending} onClick={() => toggle(row.kind)}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2 text-left disabled:opacity-60">
                <span>
                  <span className="block font-semibold">{row.label}</span>
                  <span className="block text-xs text-muted-foreground">{row.description}</span>
                </span>
                <span aria-hidden className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-border")}>
                  <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
    </section>
  )
}
