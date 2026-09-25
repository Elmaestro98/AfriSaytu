"use client"

import { useEffect, useRef } from "react"

import type { AmountKey } from "@/lib/amount-keys"

// Desktop: type the amount on the computer keyboard. Digits add, Backspace erases, Escape
// clears, Enter validates. Ignored while typing in a text field (customer number, reference…).
export function useAmountKeyboard(onKey: (key: AmountKey) => void, onEnter: () => void) {
  const handlers = useRef({ onKey, onEnter })
  useEffect(() => {
    handlers.current = { onKey, onEnter }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        handlers.current.onKey(event.key as AmountKey)
      } else if (event.key === "Backspace") {
        event.preventDefault()
        handlers.current.onKey("back")
      } else if (event.key === "Escape") {
        handlers.current.onKey("clear")
      } else if (event.key === "Enter" && !target?.closest("button, a")) {
        // On a focused button, Enter already clicks it.
        event.preventDefault()
        handlers.current.onEnter()
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [])
}
