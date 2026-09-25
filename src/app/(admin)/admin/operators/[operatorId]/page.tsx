import Link from "next/link"
import { notFound } from "next/navigation"

import { OperatorBadge } from "@/components/business/operator-badge"
import { formatLongDate } from "@/lib/dates"
import { operatorLogoSrc } from "@/lib/operator-logo"
import { getAdminDb } from "@/server/admin/db"
import { AdminAccessError } from "@/server/admin/identity"
import { loadScale } from "@/server/admin/tiers"

import { ScaleEditor } from "./scale-editor"

// Commission sheet of one catalogue operator: its mode and its daily-volume scale, the same for
// every organization. Saving closes the scale in force and starts the new one now.
export default async function OperatorScalePage({ params }: PageProps<"/admin/operators/[operatorId]">) {
  let admin
  try {
    admin = await getAdminDb()
  } catch (error) {
    if (error instanceof AdminAccessError) notFound()
    throw error
  }
  const { operatorId } = await params
  const scale = await loadScale(admin.db, operatorId)
  if (!scale) notFound()

  return (
    <>
      <div className="flex flex-col gap-1">
        <Link href="/admin/operators" className="text-sm font-semibold text-primary">← Tous les opérateurs</Link>
        <div className="flex items-center gap-3">
          <OperatorBadge name={scale.name} color={scale.color} logoSrc={operatorLogoSrc(scale.id, scale.logoUpdatedAt)} className="size-12" />
          <div>
            <h1 className="font-heading text-3xl font-extrabold">Barème {scale.name}</h1>
            <p className="text-sm text-muted-foreground">
              {scale.since ? `En vigueur depuis le ${formatLongDate(scale.since)}.` : "Aucun barème enregistré pour l'instant."} Le même pour toutes les
              entreprises.
            </p>
          </div>
        </div>
      </div>
      <div className="lg:max-w-4xl">
        <ScaleEditor operatorId={scale.id} mode={scale.mode} tiers={scale.tiers} />
      </div>
    </>
  )
}
