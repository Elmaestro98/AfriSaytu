import Image from "next/image"

import { cn } from "@/lib/utils"

type BrandMarkProps = {
  className?: string
  priority?: boolean
}

// The logo on a white tile: the green monogram stays visible on the green brand band.
export function BrandMark({ className, priority }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm",
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
