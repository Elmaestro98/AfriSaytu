"use client"

import { UserRound } from "lucide-react"
import { useCallback, useEffect, useRef } from "react"

import { keepAliveAction, lockAction } from "@/app/switch/actions"
import { SHARED_IDLE_MS } from "@/lib/shared-device"

const KEEP_ALIVE_MS = 60_000 // renew the server's 5 minutes at most once a minute
const ACTIVITY = ["pointerdown", "keydown", "touchstart", "wheel"] as const

// On a shared phone: who is at the controls, "Changer d'agent", and the lock after 5 minutes
// without a touch (the server's own 5-minute limit backs it up).
export function SharedDeviceBar({ agentName }: { agentName: string }) {
  const lastActivity = useRef(0)
  const lastPing = useRef(0)

  const lockNow = useCallback(async () => {
    await lockAction().catch(() => {})
    window.location.replace("/switch") // a full load: nothing of the previous agent stays on screen
  }, [])

  useEffect(() => {
    lastActivity.current = Date.now()
    lastPing.current = Date.now()
    const onActivity = () => {
      lastActivity.current = Date.now()
      if (Date.now() - lastPing.current > KEEP_ALIVE_MS) {
        lastPing.current = Date.now()
        keepAliveAction().catch(() => {}) // offline: the operations wait in the queue anyway
      }
    }
    const idle = () => Date.now() - lastActivity.current >= SHARED_IDLE_MS
    const onVisible = () => document.visibilityState === "visible" && idle() && lockNow()
    ACTIVITY.forEach((name) => window.addEventListener(name, onActivity, { passive: true }))
    document.addEventListener("visibilitychange", onVisible)
    const timer = window.setInterval(() => idle() && lockNow(), 10_000)
    return () => {
      ACTIVITY.forEach((name) => window.removeEventListener(name, onActivity))
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(timer)
    }
  }, [lockNow])

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-primary px-4 py-1.5 text-sm text-primary-foreground">
      <p className="flex min-w-0 items-center gap-2 font-semibold">
        <UserRound className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{agentName} aux commandes</span>
      </p>
      <button type="button" onClick={lockNow}
        className="min-h-11 shrink-0 rounded-lg px-3 font-bold text-brand-accent transition-transform active:scale-95">
        Changer d&apos;agent
      </button>
    </div>
  )
}
