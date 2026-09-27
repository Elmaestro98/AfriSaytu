import type { RoleKey } from "@/lib/roles"

// The push notifications AfriSaytu sends, who may receive each one, and their French names for
// the settings screen. Pure.

export const NOTIFICATION_KINDS = ["LOW_BALANCE", "LIQUIDITY", "DAILY_TIER", "CLOSING_REMINDER", "CLOSING_GAP", "SUBSCRIPTION"] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

const EVERYONE: readonly RoleKey[] = ["OWNER", "MANAGER", "AGENT"]

export const NOTIFICATION_INFO: Record<NotificationKind, { label: string; description: string; roles: readonly RoleKey[] }> = {
  LOW_BALANCE: { label: "Solde bas", description: "Un compte de votre point de vente passe sous son seuil d'alerte.", roles: EVERYONE },
  LIQUIDITY: { label: "Solde bientôt épuisé", description: "À ce rythme, un compte sera vide dans moins de 2 heures.", roles: EVERYONE },
  DAILY_TIER: { label: "Paliers de commission", description: "Palier suivant en vue (il reste 20 % ou moins), puis palier atteint.", roles: EVERYONE },
  CLOSING_REMINDER: { label: "Rappel de clôture", description: "À 21 h, si la journée de votre point de vente n'est pas clôturée.", roles: EVERYONE },
  CLOSING_GAP: { label: "Écart de clôture", description: "Une clôture est validée avec un écart.", roles: ["OWNER", "MANAGER"] },
  SUBSCRIPTION: { label: "Abonnement", description: "L'abonnement se termine dans 3 jours, puis la veille.", roles: ["OWNER"] },
}

export function isNotificationKind(value: string): value is NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(value)
}

export function kindsFor(role: RoleKey): NotificationKind[] {
  return NOTIFICATION_KINDS.filter((kind) => NOTIFICATION_INFO[kind].roles.includes(role))
}

export type Candidate = { id: string; role: RoleKey; branchIds: readonly string[]; muted: readonly string[] }

// Who gets a notification about a branch: its members (the owner sees every branch) whose role
// may receive this kind and who did not turn it off. `branchId` null: the whole organization.
export function recipients(
  candidates: readonly Candidate[],
  target: { kind: NotificationKind; branchId: string | null; exclude?: string | null },
): string[] {
  const roles = NOTIFICATION_INFO[target.kind].roles
  return candidates
    .filter((member) => roles.includes(member.role))
    .filter((member) => member.role === "OWNER" || (target.branchId !== null && member.branchIds.includes(target.branchId)))
    .filter((member) => !member.muted.includes(target.kind) && member.id !== target.exclude)
    .map((member) => member.id)
}
