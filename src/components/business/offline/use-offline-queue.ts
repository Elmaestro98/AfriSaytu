"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import type { QueuedOperation } from "@/lib/offline/queue"
import { QUEUE_EVENT, readQueue } from "@/lib/offline/store"

// The operations waiting on this phone, read again after every change.
export function useOfflineQueue(): QueuedOperation[] {
  const [items, setItems] = useState<QueuedOperation[]>([])
  useEffect(() => {
    let alive = true
    const load = () => readQueue().then((next) => alive && setItems(next))
    load()
    window.addEventListener(QUEUE_EVENT, load)
    return () => {
      alive = false
      window.removeEventListener(QUEUE_EVENT, load)
    }
  }, [])
  return items
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

// Whether the browser believes it has a network (true on the server, to render the same first).
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
}
