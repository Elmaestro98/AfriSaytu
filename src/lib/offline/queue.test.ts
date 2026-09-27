import { describe, expect, it } from "vitest"

import { MAX_QUEUED, isFull, outcomeOf, pendingForBranch, queuedOperation, sendable, waitingForOthers, type QueuedOperation } from "@/lib/offline/queue"
import type { CreateOperationForm } from "@/schemas/operation"

const payload = (key: string, branchId = "b1"): CreateOperationForm & { idempotencyKey: string; branchId: string } => ({
  idempotencyKey: key, branchId, operatorId: "wave", type: "DEPOSIT", amount: 25_000, fee: null, commission: null, feeInCash: false,
  manual: null, customerPhone: "771234567", reference: "", note: "", clientCreatedAt: "2026-09-27T14:05:00.000Z", confirmDuplicate: true,
})

const item = (key: string, memberId: string, savedAt: string, state: QueuedOperation["state"] = "pending"): QueuedOperation => ({
  ...queuedOperation({ payload: payload(key), memberId, memberName: memberId, label: "Dépôt", now: new Date(savedAt) }),
  state,
})

describe("queuedOperation", () => {
  it("binds the operation to its author, marks it offline and never pre-confirms a duplicate", () => {
    const queued = queuedOperation({ payload: payload("k1"), memberId: "awa", memberName: "Awa", label: "Dépôt Wave", now: new Date("2026-09-27T14:05:00.000Z") })
    expect(queued).toMatchObject({ key: "k1", memberId: "awa", branchId: "b1", state: "pending", savedAt: "2026-09-27T14:05:00.000Z" })
    expect(queued.payload).toMatchObject({ enteredOffline: true, expectedMemberId: "awa", confirmDuplicate: false, idempotencyKey: "k1" })
  })
})

describe("sendable", () => {
  const items = [
    item("late", "awa", "2026-09-27T14:30:00.000Z"),
    item("early", "awa", "2026-09-27T14:05:00.000Z"),
    item("moussa", "moussa", "2026-09-27T14:10:00.000Z"),
    item("refused", "awa", "2026-09-27T14:00:00.000Z", "blocked"),
  ]

  it("sends only the member's own pending operations, oldest first", () => {
    expect(sendable(items, "awa").map((queued) => queued.key)).toEqual(["early", "late"])
  })

  it("keeps another member's operations for their own session", () => {
    expect(waitingForOthers(items, "awa").map((queued) => queued.key)).toEqual(["moussa"])
    expect(sendable(items, "moussa").map((queued) => queued.key)).toEqual(["moussa"])
  })
})

describe("outcomeOf", () => {
  it("removes a sent operation, including one the server already had", () => {
    expect(outcomeOf({ ok: true })).toEqual({ kind: "sent" })
  })

  it("keeps it for later without network or on a passing failure", () => {
    expect(outcomeOf("network")).toEqual({ kind: "retry" })
    expect(outcomeOf({ ok: false, error: "Accès refusé. Reconnectez-vous.", retry: true })).toEqual({ kind: "retry" })
  })

  it("stops on a refusal the agent must look at", () => {
    expect(outcomeOf({ ok: false, error: "Solde insuffisant" })).toEqual({ kind: "blocked", error: "Solde insuffisant", duplicate: false })
    expect(outcomeOf({ ok: false, error: "Opération identique", duplicate: true })).toEqual({ kind: "blocked", error: "Opération identique", duplicate: true })
  })
})

describe("limits", () => {
  it("refuses beyond 50 operations on one phone", () => {
    const many = Array.from({ length: MAX_QUEUED }, (_, index) => item(`k${index}`, "awa", "2026-09-27T14:00:00.000Z"))
    expect(isFull(many.slice(1))).toBe(false)
    expect(isFull(many)).toBe(true)
  })

  it("counts what a branch's closing must wait for", () => {
    const items = [item("a", "awa", "2026-09-27T14:00:00.000Z"), { ...item("b", "awa", "2026-09-27T14:00:00.000Z"), branchId: "b2" }]
    expect(pendingForBranch(items, "b1")).toBe(1)
    expect(pendingForBranch(items, "b3")).toBe(0)
  })
})
