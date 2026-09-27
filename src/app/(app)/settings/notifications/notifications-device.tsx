"use client"

import { BellOff, BellRing, Send } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"

import { registerDeviceAction, removeDeviceAction, sendTestAction } from "./actions"

type Status = "checking" | "unsupported" | "ios-install" | "no-worker" | "denied" | "off" | "on"

// The VAPID public key (base64url) as the browser wants it.
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index)
  return bytes
}

async function currentRegistration(): Promise<ServiceWorkerRegistration | null> {
  return (await navigator.serviceWorker.getRegistration("/")) ?? null
}

async function readStatus(): Promise<Status> {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const installed = window.matchMedia("(display-mode: standalone)").matches
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return ios && !installed ? "ios-install" : "unsupported"
  if (Notification.permission === "denied") return "denied"
  const registration = await currentRegistration()
  if (!registration) return "no-worker" // development build: the service worker only runs in production
  return (await registration.pushManager.getSubscription()) ? "on" : "off"
}

const HELP: Partial<Record<Status, string>> = {
  unsupported: "Ce navigateur ne reçoit pas de notifications. Sur Android, utilisez Chrome.",
  "ios-install": "Sur iPhone, installez d'abord AfriSaytu : bouton Partager, puis « Sur l'écran d'accueil ». Ouvrez-la depuis l'icône et revenez ici.",
  "no-worker": "Les notifications fonctionnent sur l'application en ligne ou installée (pas en version de développement).",
  denied: "Les notifications sont bloquées pour ce site. Autorisez-les dans les réglages du navigateur (icône à gauche de l'adresse), puis revenez ici.",
}

// Turns push notifications on or off for THIS device, and sends a test.
export function NotificationsDevice({ publicKey, devices }: { publicKey: string | null; devices: number }) {
  const [status, setStatus] = useState<Status>("checking")
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    readStatus().then(setStatus, () => setStatus("unsupported"))
  }, [])

  const enable = () =>
    startTransition(async () => {
      setFeedback(null)
      if (!publicKey) return setFeedback({ ok: false, text: "Les notifications ne sont pas encore configurées sur ce serveur." })
      const permission = await Notification.requestPermission()
      if (permission !== "granted") return setStatus(permission === "denied" ? "denied" : "off")
      const registration = await currentRegistration()
      if (!registration) return setStatus("no-worker")
      const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }))
      const result = await registerDeviceAction({ ...subscription.toJSON(), userAgent: navigator.userAgent.slice(0, 300) })
      setFeedback(result.ok ? { ok: true, text: result.message ?? "Activées." } : { ok: false, text: result.error })
      if (result.ok) setStatus("on")
    })

  const disable = () =>
    startTransition(async () => {
      setFeedback(null)
      const subscription = await (await currentRegistration())?.pushManager.getSubscription()
      if (subscription) {
        await removeDeviceAction({ endpoint: subscription.endpoint })
        await subscription.unsubscribe()
      }
      setStatus("off")
      setFeedback({ ok: true, text: "Notifications désactivées sur cet appareil." })
    })

  const test = () =>
    startTransition(async () => {
      const result = await sendTestAction()
      setFeedback(result.ok ? { ok: true, text: `${result.message ?? "Envoyée."} Elle arrive en quelques secondes.` } : { ok: false, text: result.error })
    })

  return (
    <section aria-labelledby="device-title" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          {status === "on" ? <BellRing className="size-5" /> : <BellOff className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="device-title" className="font-heading text-lg font-bold">Ce téléphone</h2>
          <p className="text-sm text-muted-foreground">
            {status === "on" ? "Les notifications sont activées ici." : status === "checking" ? "Vérification…" : "Les notifications sont désactivées ici."}
            {devices > 0 && ` ${devices} appareil${devices > 1 ? "s" : ""} activé${devices > 1 ? "s" : ""} pour votre compte.`}
          </p>
        </div>
      </div>

      {HELP[status] && <p className="rounded-xl bg-muted p-3 text-sm">{HELP[status]}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        {status === "off" && (
          <Button type="button" className="h-12 font-bold" disabled={isPending} onClick={enable}>
            <BellRing className="size-4" aria-hidden /> Activer sur ce téléphone
          </Button>
        )}
        {status === "on" && (
          <>
            <Button type="button" className="h-12 font-bold" disabled={isPending} onClick={test}>
              <Send className="size-4" aria-hidden /> Envoyer un test
            </Button>
            <Button type="button" variant="outline" className="h-12" disabled={isPending} onClick={disable}>
              Désactiver ici
            </Button>
          </>
        )}
      </div>
      {feedback && <p role="status" className={feedback.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-destructive"}>{feedback.text}</p>}
    </section>
  )
}
