"use client"

import { useSyncExternalStore } from "react"

// True when the CSS media query matches (e.g. desktop layout). False while rendering on the server.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const DESKTOP_QUERY = "(min-width: 1024px)"
