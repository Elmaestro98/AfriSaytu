import { notFound } from "next/navigation"

import { OperatorBadge } from "@/components/business/operator-badge"
import { formatAmount } from "@/lib/money"
import { operatorLogoSrc } from "@/lib/operator-logo"
import { cn } from "@/lib/utils"
import { getAdminDb } from "@/server/admin/db"
import { AdminAccessError } from "@/server/admin/identity"
import { listCatalog } from "@/server/admin/operators"
import { removalOf } from "@/server/operators/catalog-rules"

import { SubmitButton } from "../submit-button"
import { reactivateOperatorAction, removeOperatorAction } from "./actions"
import { OperatorForm } from "./operator-form"

// Global operator catalogue (F-10): the SaaS admin creates operators, every organization sees them
// and chooses which ones it uses (Réglages → Opérateurs).
export default async function AdminOperatorsPage({ searchParams }: PageProps<"/admin/operators">) {
  let admin
  try {
    admin = await getAdminDb()
  } catch (error) {
    if (error instanceof AdminAccessError) notFound()
    throw error
  }
  const [operators, query] = await Promise.all([listCatalog(admin.db), searchParams])
  const ok = typeof query.ok === "string" ? query.ok : null
  const error = typeof query.error === "string" ? query.error : null

  return (
    <>
      <div>
        <h1 className="font-heading text-3xl font-extrabold">Opérateurs</h1>
        <p className="text-sm text-muted-foreground">Catalogue commun à toutes les entreprises. Chacune choisit ensuite ceux qu&apos;elle utilise.</p>
      </div>
      {ok && <p role="status" className="rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground">{ok}</p>}
      {error && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 font-semibold text-destructive">{error}</p>}

      <section className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-card p-4 lg:max-w-xl">
        <h2 className="font-heading text-lg font-bold">Nouvel opérateur</h2>
        <OperatorForm />
      </section>

      <ul className="grid gap-3 lg:grid-cols-2">
        {operators.map((operator) => {
          const used = removalOf(operator.usage) === "DEACTIVATE"
          return (
            <li key={operator.id} className={cn("flex flex-col gap-3 rounded-2xl border bg-card p-4", !operator.isActive && "opacity-70")}>
              <div className="flex items-center gap-3">
                <OperatorBadge name={operator.name} color={operator.color} logoSrc={operatorLogoSrc(operator.id, operator.logoUpdatedAt)} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{operator.name} <span className="font-mono text-xs text-muted-foreground">{operator.code}</span></p>
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {formatAmount(operator.usage.organizations)} entreprise(s) · {formatAmount(operator.usage.transactions)} opération(s)
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", operator.isActive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                  {operator.isActive ? "Actif" : "Désactivé"}
                </span>
              </div>
              {!operator.logoUpdatedAt && <p className="text-sm font-semibold text-brand-accent-strong">Pas encore de logo : ajoutez-en un ci-dessous.</p>}
              <details className="rounded-xl border p-3">
                <summary className="cursor-pointer text-sm font-semibold">Modifier le nom, la couleur ou le logo</summary>
                <div className="pt-3">
                  <OperatorForm operator={{ id: operator.id, name: operator.name, color: operator.color, logoSrc: operatorLogoSrc(operator.id, operator.logoUpdatedAt) }} />
                </div>
              </details>
              {operator.isActive ? (
                <form action={removeOperatorAction} className="flex flex-col gap-1">
                  <input type="hidden" name="operatorId" value={operator.id} />
                  <SubmitButton danger label={used ? "Désactiver partout" : "Supprimer"} />
                  <span className="text-xs text-muted-foreground">
                    {used ? "Déjà utilisé : il sera masqué à la saisie, l'historique reste intact." : "Jamais utilisé : il sera supprimé définitivement."}
                  </span>
                </form>
              ) : (
                <form action={reactivateOperatorAction}>
                  <input type="hidden" name="operatorId" value={operator.id} />
                  <SubmitButton label="Réactiver" />
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
