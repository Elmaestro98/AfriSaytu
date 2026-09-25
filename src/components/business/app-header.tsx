import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

import { BrandMark } from "@/components/business/brand-mark"

type AppHeaderProps = {
  title: string
  subtitle?: string
  backHref?: string
}

// Top bar of the signed-in screens.
export function AppHeader({ title, subtitle, backHref }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Retour"
            className="-ml-2 flex size-11 items-center justify-center rounded-lg text-primary hover:bg-accent"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
        ) : (
          <BrandMark className="size-10 rounded-lg border shadow-none" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg leading-tight font-bold">{title}</p>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="hidden sm:block">
          <OrganizationSwitcher hidePersonal />
        </div>
        <UserButton />
      </div>
    </header>
  )
}
