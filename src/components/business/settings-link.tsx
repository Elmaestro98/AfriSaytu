import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"

type SettingsLinkProps = {
  href: string
  icon: LucideIcon
  title: string
  description: string
}

export function SettingsLink({ href, icon: Icon, title, description }: SettingsLinkProps) {
  return (
    <Link
      href={href}
      className="flex min-h-16 items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  )
}
