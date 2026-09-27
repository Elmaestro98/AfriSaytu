"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const GIVE_UP_MS = 8_000 // a link that turns out not to change the page (a download): hide anyway

// The internal page a click leads to, or null when it is not a page change we can follow.
function targetOf(event: MouseEvent): string | null {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null
  const link = (event.target as Element | null)?.closest?.("a")
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return null
  const url = new URL(link.href, window.location.href)
  if (url.origin !== window.location.origin || url.pathname.startsWith("/api/") || /\.[a-z0-9]+$/i.test(url.pathname)) return null
  const next = url.pathname + url.search
  return next === window.location.pathname + window.location.search ? null : next
}

// A thin brand-coloured bar at the top while a page loads: the screen answers at once, the
// skeleton of the next page follows. Never blocks anything.
export function NavigationProgress() {
  const pathname = usePathname()
  const search = useSearchParams()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const loading = useRef(false)
  const timers = useRef<{ trickle?: number; giveUp?: number; hide?: number }>({})
  const finishRef = useRef<() => void>(() => {})

  useEffect(() => {
    const clear = () => {
      window.clearInterval(timers.current.trickle)
      window.clearTimeout(timers.current.giveUp)
      window.clearTimeout(timers.current.hide)
    }
    const finish = () => {
      if (!loading.current) return
      loading.current = false
      clear()
      setWidth(100)
      timers.current.hide = window.setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 250)
    }
    const start = () => {
      clear()
      loading.current = true
      setVisible(true)
      setWidth(15)
      // Creeps towards 90 % and waits there for the page.
      timers.current.trickle = window.setInterval(() => setWidth((current) => (current < 90 ? current + (90 - current) * 0.12 : current)), 200)
      timers.current.giveUp = window.setTimeout(finish, GIVE_UP_MS)
    }
    const onClick = (event: MouseEvent) => {
      if (targetOf(event)) start()
    }
    finishRef.current = finish
    document.addEventListener("click", onClick, true)
    window.addEventListener("popstate", start)
    return () => {
      clear()
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", start)
    }
  }, [])

  // The new address is shown: the page is there.
  useEffect(() => {
    finishRef.current()
  }, [pathname, search])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full bg-brand-accent shadow-[0_0_8px_var(--brand-accent)] transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${width}%`, opacity: visible ? 1 : 0 }}
      />
    </div>
  )
}
