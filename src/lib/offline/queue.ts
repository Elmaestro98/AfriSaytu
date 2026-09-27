import type { CreateOperationForm } from "@/schemas/operation"

// Operations kept on the phone while there is no network (pure rules; storage in store.ts).
// Each one keeps its idempotency key: sending it twice never records it twice.

export const MAX_QUEUED = 50 // beyond, offline entry is refused (the owner's choice)

export type QueuedOperation = {
  key: string // the operation's idempotency key
  memberId: string // only this member's session may send it
  memberName: string
  branchId: string
  label: string // "Dépôt Wave · 25 000 FCFA", for the waiting list
  savedAt: string // ISO, when it was kept on the phone
  payload: CreateOperationForm
  state: "pending" | "blocked" // blocked: the server refused it, the agent decides
  error: string | null
  duplicate: boolean // refused as a probable duplicate: the agent confirms or deletes
}

export type SendResponse = { ok: true } | { ok: false; error: string; duplicate?: boolean; retry?: boolean }

export type SendOutcome = { kind: "sent" } | { kind: "retry" } | { kind: "blocked"; error: string; duplicate: boolean }

// What the answer of the server (or its absence) means for a queued operation.
export function outcomeOf(response: SendResponse | "network"): SendOutcome {
  if (response === "network") return { kind: "retry" }
  if (response.ok) return { kind: "sent" }
  if (response.retry) return { kind: "retry" }
  return { kind: "blocked", error: response.error, duplicate: response.duplicate === true }
}

// The operations this member's session sends now, oldest first.
export function sendable(items: readonly QueuedOperation[], memberId: string): QueuedOperation[] {
  return items.filter((item) => item.state === "pending" && item.memberId === memberId).sort((a, b) => a.savedAt.localeCompare(b.savedAt))
}

// Kept for another member of this phone: sent when they sign in again.
export function waitingForOthers(items: readonly QueuedOperation[], memberId: string): QueuedOperation[] {
  return items.filter((item) => item.memberId !== memberId)
}

export function isFull(items: readonly QueuedOperation[]): boolean {
  return items.length >= MAX_QUEUED
}

// Operations of a branch still on this phone: its closing must wait for them.
export function pendingForBranch(items: readonly QueuedOperation[], branchId: string): number {
  return items.filter((item) => item.branchId === branchId).length
}

export function queuedOperation(input: {
  payload: CreateOperationForm & { idempotencyKey: string; branchId: string }
  memberId: string
  memberName: string
  label: string
  now: Date
}): QueuedOperation {
  return {
    key: input.payload.idempotencyKey,
    memberId: input.memberId,
    memberName: input.memberName,
    branchId: input.payload.branchId,
    label: input.label,
    savedAt: input.now.toISOString(),
    // Sent later by its author only; its time stays the phone's time, for information.
    payload: { ...input.payload, enteredOffline: true, expectedMemberId: input.memberId, confirmDuplicate: false },
    state: "pending",
    error: null,
    duplicate: false,
  }
}
