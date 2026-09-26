import Image from "next/image"

import { cn } from "@/lib/utils"

type BrandMarkProps = {
  className?: string
  priority?: boolean
  bare?: boolean // light background: the logo alone, without its white tile
}

// The logo on a white tile, so the green monogram stays visible on the green brand band. On a
// light background (`bare`), the logo alone.
export function BrandMark({ className, priority, bare = false }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center",
        !bare && "rounded-xl bg-white p-1.5 shadow-sm",
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt="AfriSaytu"
        width={408}
        height={612}
        priority={priority}
        className="h-full w-auto"
      />
    </span>
  )
}
