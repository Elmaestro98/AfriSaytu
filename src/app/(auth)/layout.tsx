import Link from "next/link"

import { BrandMark } from "@/components/business/brand-mark"

// Shared frame of the sign-in and sign-up screens: brand band, then the Clerk card.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-primary px-4 pt-6 pb-20 text-primary-foreground">
        <Link href="/" className="mx-auto flex w-fit items-center gap-3">
          <BrandMark priority />
          <span className="font-heading text-2xl font-bold">AfriSaytu</span>
        </Link>
      </div>
      <div className="-mt-14 flex flex-1 justify-center px-4 pb-10">{children}</div>
    </div>
  )
}
