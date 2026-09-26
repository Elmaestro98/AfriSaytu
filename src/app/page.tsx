import { auth } from "@clerk/nextjs/server"
import { CircleCheck, Download } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

import { BrandMark } from "@/components/business/brand-mark"
import { ReceiptCard, type ReceiptLine } from "@/components/business/receipt-card"
import { Button } from "@/components/ui/button"
import { OPERATOR_CATALOG } from "@/server/operators/catalog-data"

// Illustrative figures only: they are shown as an example, not as real data or tariffs.
const EXAMPLE_BALANCES: Record<string, number> = {
  WAVE: 1_250_000,
  ORANGE_MONEY: 850_000,
  MIXX: 420_000,
}
const EXAMPLE_CASH = 650_000

const exampleLines: ReceiptLine[] = [
  ...OPERATOR_CATALOG.map((operator) => ({
    key: operator.code,
    label: operator.name,
    amount: EXAMPLE_BALANCES[operator.code] ?? 0,
    color: operator.color,
  })),
  { key: "CASH", label: "Espèces", amount: EXAMPLE_CASH },
]

const exampleTotal = exampleLines.reduce((sum, line) => sum + line.amount, 0)

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect("/dashboard")

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-primary px-4 pt-6 pb-28 text-primary-foreground md:pb-16">
        <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <BrandMark priority />
              <span className="font-heading text-2xl font-bold">AfriSaytu</span>
            </div>
            <h1 className="font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">
              Chaque soir, une caisse juste.
            </h1>
            <p className="max-w-md text-lg text-primary-foreground/85">
              Enregistrez vos opérations Wave, Orange Money et Mixx by Yas en quelques secondes.
              AfriSaytu calcule vos commissions et vos soldes, et vous aide à clôturer la journée sans écart.
            </p>
            <div className="hidden flex-col gap-3 md:flex md:max-w-xs">
              <StartButtons />
            </div>
          </div>

          <ReceiptCard
            className="-mb-24 w-full max-w-sm justify-self-center md:mb-0 md:rotate-1"
            title="Clôture du jour"
            caption="Exemple"
            lines={exampleLines}
            total={{ label: "Total compté", amount: exampleTotal }}
            footer={
              <p className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground">
                <CircleCheck className="size-4" aria-hidden />
                Écart : 0 FCFA, caisse juste
              </p>
            }
          />
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-sm flex-col gap-3 px-4 pt-32 pb-10 md:hidden">
        <StartButtons />
      </section>

      <p className="mx-auto mt-auto max-w-md px-4 pb-8 text-center text-sm text-muted-foreground md:pt-10">
        AfriSaytu ne transfère pas d&apos;argent : vous gardez l&apos;application de votre opérateur
        et enregistrez ici ce que vous y avez fait.
      </p>
    </main>
  )
}

function StartButtons() {
  return (
    <>
      <Button asChild size="lg" className="h-12 bg-brand-accent text-base font-bold text-brand-accent-foreground hover:bg-brand-accent/90">
        <Link href="/sign-up">Créer mon compte</Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="h-12 border-primary/30 text-base md:border-primary-foreground/40 md:bg-transparent md:text-primary-foreground md:hover:bg-primary-foreground/10">
        <Link href="/sign-in">J&apos;ai déjà un compte</Link>
      </Button>
      {/* A plain link with "download": the PDF is saved instead of opening a page. */}
      <a href="/guide-utilisateur-afrisaytu.pdf" download
        className="flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-primary underline-offset-4 hover:underline md:justify-start md:text-primary-foreground">
        <Download className="size-4" aria-hidden />
        Télécharger le guide d&apos;utilisation (PDF)
      </a>
    </>
  )
}
