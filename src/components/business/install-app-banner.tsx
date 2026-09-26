"use client"

import { Download, Share, X } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"

// Chrome/Android event that lets the page offer the installation itself (not in the DOM types).
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

const DISMISSED_KEY = "afrisaytu:install-dismissed"

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1"
  } catch {
    return false // private mode or blocked storage: simply ask again next time
  }
}

type Device = "installed" | "dismissed" | "ios" | "other"

// Read once in the browser; "other" on the server so the first render matches (no banner).
function readDevice(): Device {
  const installed = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && navigator.standalone === true)
  if (installed) return "installed"
  if (readDismissed()) return "dismissed"
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "other"
}
const subscribeNothing = () => () => {}

// "Installer AfriSaytu" on the home screen: a button where the browser allows it (Android), the
// steps on an iPhone (Safari has no such button). Hidden once installed or dismissed.
export function InstallAppBanner() {
  const device = useSyncExternalStore(subscribeNothing, readDevice, () => "other" as Device)
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null)
  const [closed, setClosed] = useState(false)
  const ios = device === "ios"
  const visible = !closed && device !== "installed" && device !== "dismissed" && (prompt !== null || ios)

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault() // keep it for our own button
      setPrompt(event as InstallPromptEvent)
    }
    const onInstalled = () => setClosed(true)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const dismiss = () => {
    setClosed(true)
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1")
    } catch {
      // storage unavailable: the banner only comes back on the next visit
    }
  }

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === "accepted") setClosed(true)
    setPrompt(null)
  }

  if (!visible) return null
  return (
    <section aria-label="Installer l'application" className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-accent p-4 text-accent-foreground">
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Download className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Installer AfriSaytu sur ce téléphone</p>
        {ios ? (
          <p className="text-sm">
            Touchez <Share className="inline size-4 align-text-bottom" aria-label="Partager" /> puis « Sur l&apos;écran d&apos;accueil ».
          </p>
        ) : (
          <p className="text-sm">Une icône sur l&apos;écran d&apos;accueil, en plein écran, qui s&apos;ouvre plus vite.</p>
        )}
        {prompt && (
          <Button type="button" className="mt-3 h-11 font-bold" onClick={install}>
            Installer
          </Button>
        )}
      </div>
      <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Plus tard" onClick={dismiss}>
        <X className="size-5" aria-hidden />
      </Button>
    </section>
  )
}
