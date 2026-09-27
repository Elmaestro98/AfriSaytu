"use client"

import { useCallback } from "react"

import { MAX_QUEUED, isFull, queuedOperation } from "@/lib/offline/queue"
import { keepOperation, readQueue } from "@/lib/offline/store"
import type { CreateOperationForm } from "@/schemas/operation"

export type KeepResult = { kind: "offline" | "error"; text: string }

// No network: keep the operation on this phone for its author, to be sent later (OfflineSync).
export function useKeepOffline(member: { id: string; name: string }) {
  return useCallback(
    async (payload: CreateOperationForm & { idempotencyKey: string; branchId: string }, label: string): Promise<KeepResult> => {
      if (isFull(await readQueue())) {
        return { kind: "error", text: `${MAX_QUEUED} opérations attendent déjà sur ce téléphone : retrouvez du réseau pour les envoyer avant d'en saisir d'autres.` }
      }
      try {
        await keepOperation(queuedOperation({ payload, memberId: member.id, memberName: member.name, label, now: new Date() }))
        return { kind: "offline", text: "Pas de réseau : opération gardée sur ce téléphone. Elle sera envoyée dès le retour du réseau." }
      } catch {
        return { kind: "error", text: "Pas de réseau, et ce téléphone ne peut pas garder l'opération (navigation privée ?). Notez-la et saisissez-la au retour du réseau." }
      }
    },
    [member.id, member.name],
  )
}
