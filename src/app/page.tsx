import { auth } from "@clerk/nextjs/server"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6 text-center">
      <Image
        src="/logo.png"
        alt="Logo AfriSaytu"
        width={408}
        height={612}
        priority
        className="h-44 w-auto"
      />
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-primary">AfriSaytu</h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Le logiciel de caisse des agents de transfert d&apos;argent. Soldes, commissions et
          clôture journalière, en quelques secondes.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Button asChild size="lg" className="h-12 text-base">
          <Link href="/sign-up">Créer mon compte</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 text-base">
          <Link href="/sign-in">Se connecter</Link>
        </Button>
      </div>
    </main>
  )
}
