"use client"

import { useClerk } from "@clerk/nextjs"
import Link from "next/link"
import { useEffect, useState } from "react"

import { BrandMark } from "@/components/business/brand-mark"

// Signs the phone's account out as soon as the page shows; a link in case it takes too long.
export function SignOutNow() {
  const { signOut, loaded } = useClerk()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!loaded) return
    signOut({ redirectUrl: "/sign-in" }).catch(() => setSlow(true))
    const timer = window.setTimeout(() => setSlow(true), 6_000)
    return () => window.clearTimeout(timer)
  }, [loaded, signOut])

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-primary p-6 text-center text-primary-foreground">
      <BrandMark className="size-16" />
      <h1 className="font-heading text-2xl font-bold">Déconnexion du téléphone…</h1>
      <p className="max-w-xs text-sm opacity-85">Ce téléphone n&apos;est plus partagé. Le mot de passe du compte sera demandé pour revenir.</p>
      {slow && (
        <Link href="/sign-in" className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-brand-accent px-5 font-bold text-brand-accent-foreground">
          Continuer
        </Link>
      )}
    </main>
  )
}
