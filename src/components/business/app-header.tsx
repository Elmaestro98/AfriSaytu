import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

import { BrandMark } from "@/components/business/brand-mark"

type AppHeaderProps = {
  title: string
  subtitle?: string
  backHref?: string
}

// Top bar of the signed-in screens. On desktop the logo and the account menu live in the side
// navigation, so the bar only carries the page title.
export function AppHeader({ title, subtitle, backHref }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-md items-center gap-3 px-4 lg:mx-0 lg:h-20 lg:max-w-none lg:px-8">
        {backHref ? (
          <Link
            href={backHref}
            aria-label="Retour"
            className="-ml-2 flex size-11 items-center justify-center rounded-lg text-primary hover:bg-accent"
          >
            <ChevronLeft className="size-6" aria-hidden />
          </Link>
        ) : (
          <BrandMark bare className="size-10 lg:hidden" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-lg leading-tight font-bold lg:text-2xl">{title}</p>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 lg:hidden">
          <div className="hidden sm:block">
            <OrganizationSwitcher hidePersonal />
          </div>
          <UserButton />
        </div>
      </div>
    </header>
  )
}
