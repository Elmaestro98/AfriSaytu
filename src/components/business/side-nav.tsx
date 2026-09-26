"use client"

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { Plus } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandMark } from "@/components/business/brand-mark"
import { NAV_ITEMS, isNavActive, type NavKey } from "@/components/business/nav-items"
import { cn } from "@/lib/utils"

type SideNavProps = {
  items: readonly NavKey[]
  organizationName: string
  memberName: string
  roleLabel: string
}

// Desktop navigation (mockups 01 and 02): brand, main action, sections, account at the bottom.
export function SideNav({ items, organizationName, memberName, roleLabel }: SideNavProps) {
  const pathname = usePathname()
  const sections = items.filter((key) => key !== "entry")

  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
        <BrandMark priority bare className="size-11" />
        <span className="min-w-0">
          <span className="block font-heading text-lg leading-tight font-bold">AfriSaytu</span>
          <span className="block truncate text-sm text-muted-foreground">{organizationName}</span>
        </span>
      </Link>

      {items.includes("entry") && (
        <div className="px-4 pb-4">
          <Link href={NAV_ITEMS.entry.href}
            className={cn("flex h-12 items-center justify-center gap-2 rounded-xl font-heading text-base font-extrabold shadow-sm transition-colors",
              isNavActive(pathname, "entry") ? "bg-primary text-primary-foreground" : "bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90")}>
            <Plus className="size-5" strokeWidth={2.5} aria-hidden />
            Nouvelle opération
          </Link>
        </div>
      )}

      <nav aria-label="Navigation principale" className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {sections.map((key) => {
            const { href, label, icon: Icon } = NAV_ITEMS[key]
            const active = isNavActive(pathname, key)
            return (
              <li key={key}>
                <Link href={href} aria-current={active ? "page" : undefined}
                  className={cn("flex h-11 items-center gap-3 rounded-xl px-3 font-semibold transition-colors",
                    active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent")}>
                  <Icon className="size-5" aria-hidden />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="flex flex-col gap-3 border-t p-4">
        <OrganizationSwitcher hidePersonal />
        <div className="flex items-center gap-3">
          <UserButton />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{memberName}</span>
            <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
          </span>
        </div>
      </div>
    </aside>
  )
}
