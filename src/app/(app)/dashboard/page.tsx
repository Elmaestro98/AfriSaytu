import { auth } from "@clerk/nextjs/server"
import { Percent, Smartphone, Store, Users } from "lucide-react"
import { redirect } from "next/navigation"

import { AppHeader } from "@/components/business/app-header"
import { BrandMark } from "@/components/business/brand-mark"
import { SettingsLink } from "@/components/business/settings-link"
import { roleLabel } from "@/lib/roles"
import { requireActor, type ActorContext } from "@/server/auth/actor"
import { authorize } from "@/server/auth/permissions"
import { SessionError } from "@/server/auth/session"
import { isOrganizationProvisioned } from "@/server/onboarding/queries"

function AccessMessage({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <BrandMark className="size-16 border" />
      <h1 className="font-heading text-2xl font-bold">{title}</h1>
      <p className="max-w-sm text-muted-foreground">{text}</p>
    </main>
  )
}

// Temporary landing page after sign-in. The real dashboard comes in a later sprint.
export default async function DashboardPage() {
  const { orgId } = await auth()

  // No organization yet, or not configured: the setup assistant comes first.
  if (!orgId || !(await isOrganizationProvisioned(orgId))) redirect("/onboarding")

  // Resolves the member. On the first sign-in of an invited person, this creates their profile.
  let ctx: ActorContext
  try {
    ctx = await requireActor()
  } catch (error) {
    if (error instanceof SessionError && error.code === "MEMBER_DISABLED") {
      return <AccessMessage title="Compte désactivé" text="Votre accès a été désactivé. Contactez le responsable de l'entreprise." />
    }
    if (error instanceof SessionError && error.code === "NOT_A_MEMBER") {
      return <AccessMessage title="Accès non autorisé" text="Vous n'avez pas d'invitation valide pour cette entreprise. Demandez au responsable de vous inviter." />
    }
    throw error
  }

  const organization = await ctx.db.organization.findFirst({ select: { name: true } })
  const canManageTeam = authorize(ctx.actor, "member:manage").allowed
  const canManageCatalog = authorize(ctx.actor, "catalog:manage").allowed
  const canManageRules = authorize(ctx.actor, "commissionRule:manage").allowed
  const firstName = ctx.memberName.split(" ")[0]

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={organization?.name ?? "AfriSaytu"} subtitle={roleLabel(ctx.actor.role)} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="font-heading text-3xl font-extrabold">Bonjour {firstName}</h1>

        <section className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="text-sm font-semibold tracking-wide text-brand-accent uppercase">Bientôt ici</p>
          <p className="mt-2 font-heading text-xl font-bold">Vos soldes, vos opérations du jour et vos commissions.</p>
          <p className="mt-1 text-primary-foreground/80">
            La saisie des opérations arrive avec la prochaine mise à jour.
          </p>
        </section>

        {(canManageCatalog || canManageRules || canManageTeam) && (
          <section className="flex flex-col gap-3">
            <h2 className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Réglages</h2>
            {canManageCatalog && (
              <SettingsLink
                href="/settings/branches"
                icon={Store}
                title="Points de vente"
                description="Comptes, soldes et seuils d'alerte"
              />
            )}
            {canManageCatalog && (
              <SettingsLink
                href="/settings/operators"
                icon={Smartphone}
                title="Opérateurs"
                description="Wave, Orange Money, Mixx by Yas"
              />
            )}
            {canManageRules && (
              <SettingsLink
                href="/settings/commissions"
                icon={Percent}
                title="Commissions"
                description="Vos barèmes par opérateur et par tranche"
              />
            )}
            {canManageTeam && (
              <SettingsLink
                href="/settings/team"
                icon={Users}
                title="Équipe"
                description="Invitez vos agents et gérez leurs accès"
              />
            )}
          </section>
        )}
      </main>
    </div>
  )
}
