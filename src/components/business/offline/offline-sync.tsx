"use client"

import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { createOperationAction } from "@/app/(app)/operations/new/actions"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatTime } from "@/lib/dates"
import { outcomeOf, sendable, waitingForOthers, type QueuedOperation, type SendResponse } from "@/lib/offline/queue"
import { dropOperation, keepOperation, readQueue } from "@/lib/offline/store"
import { cn } from "@/lib/utils"

import { useOfflineQueue, useOnline } from "./use-offline-queue"

const RETRY_MS = 30_000

// Sends the operations kept offline as soon as the network is back (on every signed-in screen),
// one at a time, oldest first, only in their author's session. Shows what is still waiting.
export function OfflineSync({ memberId }: { memberId: string }) {
  const router = useRouter()
  const items = useOfflineQueue()
  const online = useOnline()
  const running = useRef(false)
  const [open, setOpen] = useState(false)

  const sync = useCallback(async () => {
    if (running.current || !navigator.onLine) return
    running.current = true
    let sent = 0
    try {
      for (const item of sendable(await readQueue(), memberId)) {
        let response: SendResponse | "network"
        try {
          response = await createOperationAction(item.payload)
        } catch {
          response = "network"
        }
        const outcome = outcomeOf(response)
        if (outcome.kind === "retry") break // keep the order: the next ones wait too
        if (outcome.kind === "sent") {
          await dropOperation(item.key)
          sent += 1
        } else {
          await keepOperation({ ...item, state: "blocked", error: outcome.error, duplicate: outcome.duplicate })
        }
      }
    } finally {
      running.current = false
    }
    if (sent > 0) router.refresh()
  }, [memberId, router])

  const mine = items.filter((item) => item.memberId === memberId)
  const waiting = mine.some((item) => item.state === "pending")

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && sync()
    window.addEventListener("online", sync)
    document.addEventListener("visibilitychange", onVisible)
    const timer = waiting ? window.setInterval(sync, RETRY_MS) : undefined
    return () => {
      window.removeEventListener("online", sync)
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(timer)
    }
  }, [sync, waiting])

  useEffect(() => {
    if (waiting) sync()
  }, [waiting, sync])

  const others = waitingForOthers(items, memberId)
  if (items.length === 0) return null
  const blocked = mine.filter((item) => item.state === "blocked").length
  const pending = mine.length - blocked

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-20 flex justify-center px-4 lg:top-24">
        <button type="button" onClick={() => setOpen(true)}
          className={cn("pointer-events-auto flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-md",
            blocked > 0 ? "bg-destructive text-white" : "bg-brand-accent text-brand-accent-foreground")}>
          {blocked > 0 ? <TriangleAlert className="size-4" aria-hidden /> : online ? <RefreshCw className="size-4 animate-spin" aria-hidden /> : <CloudOff className="size-4" aria-hidden />}
          {blocked > 0 ? `${blocked} à vérifier` : pending > 0 ? `${pending} en attente d'envoi` : `${others.length} d'un autre membre`}
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">Opérations en attente</SheetTitle>
            <SheetDescription>
              Gardées sur ce téléphone {online ? "et envoyées automatiquement." : "faute de réseau : elles partiront dès son retour."} Ne videz pas les données du navigateur d&apos;ici là.
            </SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col gap-3 px-4 pb-6">
            {mine.map((item) => <QueuedRow key={item.key} item={item} onRetry={sync} />)}
          </ul>
          {others.length > 0 && (
            <p className="mx-4 mb-6 rounded-xl bg-muted p-3 text-sm">
              {others.length} opération{others.length > 1 ? "s" : ""} de {[...new Set(others.map((item) => item.memberName))].join(", ")} :
              envoyée{others.length > 1 ? "s" : ""} quand cette personne se reconnectera sur ce téléphone.
            </p>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function QueuedRow({ item, onRetry }: { item: QueuedOperation; onRetry: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const release = async (confirmDuplicate: boolean) => {
    await keepOperation({ ...item, state: "pending", error: null, duplicate: false, payload: { ...item.payload, confirmDuplicate } })
    onRetry()
  }

  return (
    <li className={cn("flex flex-col gap-2 rounded-xl border p-3", item.state === "blocked" && "border-destructive/40 bg-destructive/5")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">{item.label}</p>
        <p className="shrink-0 text-xs text-muted-foreground">saisie à {formatTime(new Date(item.savedAt))}</p>
      </div>
      {item.state === "pending" ? (
        <p className="text-sm text-muted-foreground">En attente d&apos;envoi</p>
      ) : (
        <>
          <p className="text-sm font-medium text-destructive">Refusée : {item.error}</p>
          <div className="flex flex-wrap gap-2">
            {item.duplicate && <Button type="button" className="h-11" onClick={() => release(true)}>Enregistrer quand même</Button>}
            {!item.duplicate && <Button type="button" variant="outline" className="h-11" onClick={() => release(false)}>Réessayer</Button>}
            {confirming ? (
              <Button type="button" variant="destructive" className="h-11" onClick={() => dropOperation(item.key)}>Supprimer définitivement</Button>
            ) : (
              <Button type="button" variant="ghost" className="h-11" onClick={() => setConfirming(true)}>Supprimer</Button>
            )}
          </div>
        </>
      )}
    </li>
  )
}
