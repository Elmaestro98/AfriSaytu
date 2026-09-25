import Link from "next/link"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"

import { AdminAccessError, requireSaasAdmin } from "@/server/admin/identity"

// SaaS admin console (F-63). Anyone else gets a plain 404: the console does not reveal itself.
// Each page and action checks again: a layout alone is not access control.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    await requireSaasAdmin()
  } catch (error) {
    if (error instanceof AdminAccessError) notFound()
    throw error
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <Link href="/admin" className="font-heading text-lg font-extrabold">Console AfriSaytu</Link>
          <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold">Admin SaaS</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:px-8">{children}</main>
    </div>
  )
}
