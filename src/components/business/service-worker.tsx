"use client"

import { useEffect } from "react"

// Registers the service worker (public/sw.js) in production only. In development it would keep
// old code in its cache and hide changes: any previous one is removed there.
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()))
      return
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => console.error("Service worker registration failed", error))
  }, [])
  return null
}
