import { ChartColumn, ClipboardCheck, History, House, Plus, Settings, Wallet, type LucideIcon } from "lucide-react"

// Navigation of the signed-in screens, shared by the bottom bar (phone) and the side bar (desktop).
export type NavKey = "home" | "operations" | "entry" | "cash" | "closing" | "supervision" | "settings"

export const NAV_ITEMS: Record<NavKey, { href: string; label: string; icon: LucideIcon }> = {
  home: { href: "/dashboard", label: "Accueil", icon: House },
  operations: { href: "/operations", label: "Historique", icon: History },
  entry: { href: "/operations/new", label: "Saisir", icon: Plus },
  cash: { href: "/cash", label: "Caisse", icon: Wallet },
  closing: { href: "/closing", label: "Clôture", icon: ClipboardCheck },
  supervision: { href: "/supervision", label: "Supervision", icon: ChartColumn },
  settings: { href: "/settings", label: "Réglages", icon: Settings },
}

export function isNavActive(pathname: string, key: NavKey): boolean {
  const href = NAV_ITEMS[key].href
  if (key === "operations") return pathname === href // "/operations/new" belongs to "Saisir"
  return pathname === href || pathname.startsWith(`${href}/`)
}
