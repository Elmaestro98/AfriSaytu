import { cn } from "@/lib/utils"

type OperatorBadgeProps = {
  name: string
  color: string | null // operator theme colour, from the catalogue
  logoSrc: string | null // lib/operator-logo operatorLogoSrc()
  className?: string // size, e.g. "size-12 text-lg"
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter((word) => word.toLowerCase() !== "by")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}

// An operator as a round badge: its logo when the SaaS admin gave one, its initials on its colour
// otherwise. Used wherever an operator is picked or listed.
export function OperatorBadge({ name, color, logoSrc, className }: OperatorBadgeProps) {
  const accent = color ?? "var(--primary)"
  if (logoSrc) {
    return (
      // A small, same-origin, already resized image: next/image would add nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoSrc} alt="" loading="lazy" decoding="async"
        className={cn("size-12 shrink-0 rounded-full border bg-white object-contain p-1", className)} />
    )
  }
  return (
    <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold", className)}
      style={{ color: accent, backgroundColor: `color-mix(in srgb, ${accent} 16%, white)` }}>
      {initials(name)}
    </span>
  )
}
