"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/dates"
import type { DeviceRow } from "@/server/devices/queries"

import { revokeDeviceAction } from "./actions"

const dateFormat = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Dakar", day: "numeric", month: "short" })

// The shared phones of the branches in reach, each withdrawable from here (even when lost).
export function DeviceList({ devices }: { devices: readonly DeviceRow[] }) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const revoke = (device: DeviceRow) =>
    startTransition(async () => {
      setError(null)
      const result = await revokeDeviceAction({ deviceId: device.id })
      setConfirming(null)
      if (!result.ok) return setError(result.error)
      toast.success("Téléphone retiré", { description: device.name })
    })

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Téléphones partagés</h2>
      {devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun téléphone partagé pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {devices.map((device) => (
            <li key={device.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-semibold">{device.name}{device.isThisPhone && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">ce téléphone</span>}</p>
                <p className="text-xs text-muted-foreground">
                  {device.branchName} · déclaré par {device.createdBy} le {dateFormat.format(device.createdAt)}
                  {device.lastSeenAt ? ` · utilisé le ${dateFormat.format(device.lastSeenAt)} à ${formatTime(device.lastSeenAt)}` : ""}
                </p>
              </div>
              {confirming === device.id ? (
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" className="h-11 flex-1" disabled={isPending} onClick={() => revoke(device)}>Retirer ce téléphone</Button>
                  <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setConfirming(null)}>Annuler</Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="h-11 self-start" onClick={() => setConfirming(device.id)}>Retirer</Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
    </section>
  )
}
