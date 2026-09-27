"use client"

import { Plus, type LucideIcon } from "lucide-react"
import Link, { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"

import { NAV_ITEMS, isNavActive, type NavKey } from "@/components/business/nav-items"
import { cn } from "@/lib/utils"

// Screens with their own bottom action bar: the navigation steps aside to leave it room.
const HIDDEN_ON = ["/operations/new"]
// Five tabs at most on a phone (mockups 04 to 06): statistics, supervision and settings are
// reached from the home screen.
const DESKTOP_ONLY: readonly NavKey[] = ["stats", "supervision", "settings"]

// Inside a tab: lights up the moment it is touched (pending), before the page arrives.
function TabContent({ icon: Icon, label, active }: { icon: LucideIcon; label: string; active: boolean }) {
  const { pending } = useLinkStatus()
  const on = active || pending
  return (
    <>
      <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-all duration-150 active:scale-90", on && "bg-accent", pending && "scale-110")}>
        <Icon className={cn("size-5 transition-colors", on ? "text-primary" : "text-muted-foreground")} aria-hidden />
      </span>
      <span className={cn("transition-colors", on ? "text-primary" : "text-muted-foreground")}>{label}</span>
    </>
  )
}

// Phone navigation, within thumb reach (mockups 04 to 06), with "Saisir" in the middle.
// Hidden on desktop, where the side navigation takes over.
export function BottomNav({ items }: { items: readonly NavKey[] }) {
  const pathname = usePathname()
  if (HIDDEN_ON.includes(pathname)) return null

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto flex h-16 w-full max-w-md items-stretch justify-around px-2">
        {items.filter((key) => !DESKTOP_ONLY.includes(key)).map((key) => {
          const { href, label, icon: Icon } = NAV_ITEMS[key]
          const active = isNavActive(pathname, key)

          if (key === "entry") {
            return (
              <li key={key} className="flex items-start justify-center">
                <Link href={href} aria-label="Saisir une opération"
                  className="-mt-5 flex size-14 items-center justify-center rounded-full bg-brand-accent text-brand-accent-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95">
                  <Plus className="size-7" strokeWidth={2.5} aria-hidden />
                </Link>
              </li>
            )
          }

          return (
            <li key={key} className="flex flex-1">
              <Link href={href} aria-current={active ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold">
                <TabContent icon={Icon} label={label} active={active} />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}


