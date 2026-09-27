import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { PAGE_NARROW } from "@/lib/layout"
import { cn } from "@/lib/utils"
import { requireActor } from "@/server/auth/actor"
import { SessionError } from "@/server/auth/session"
import { loadNotificationSettings } from "@/server/notifications/devices"
import { NOTIFICATION_INFO } from "@/server/notifications/kinds"
import { vapidPublicKey } from "@/server/notifications/send"

import { NotificationKinds } from "./notification-kinds"
import { NotificationsDevice } from "./notifications-device"

// Réglages -> Notifications: every member (agents included) chooses for themself.
export default async function NotificationsPage() {
  let ctx
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError) redirect("/dashboard")
    throw error
  }
  const settings = await loadNotificationSettings(ctx)

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Notifications" subtitle="Sur votre téléphone" backHref="/settings" />
      <main className={cn(PAGE_NARROW, "gap-6")}>
        <NotificationsDevice publicKey={vapidPublicKey()} devices={settings.devices} />
        <NotificationKinds
          kinds={settings.kinds.map(({ kind, muted }) => ({ kind, muted, label: NOTIFICATION_INFO[kind].label, description: NOTIFICATION_INFO[kind].description }))}
        />
        <p className="text-sm text-muted-foreground">
          Les notifications peuvent afficher des montants sur l&apos;écran verrouillé, jamais de numéro de client. Avant de prêter ou de
          donner ce téléphone, désactivez-les ici.
        </p>
      </main>
    </div>
  )
}
