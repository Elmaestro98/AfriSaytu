"use client"

import { Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NAV_ITEMS, isNavActive, type NavKey } from "@/components/business/nav-items"
import { cn } from "@/lib/utils"

// Screens with their own bottom action bar: the navigation steps aside to leave it room.
const HIDDEN_ON = ["/operations/new"]
// Five tabs at most on a phone (mockups 04 to 06): supervision and settings are reached from the
// home screen.
const DESKTOP_ONLY: readonly NavKey[] = ["supervision", "settings"]

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
                className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-accent")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}


