import type { ReactNode } from "react"

import { AppShell } from "@/components/business/app-shell"

export default function SectionLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
