import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { auth } from "@clerk/nextjs/server"

// Temporary landing page after sign-in. The real dashboard comes in a later sprint.
export default async function DashboardPage() {
  const { orgId } = await auth()

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">AfriSaytu</h1>
        <div className="flex items-center gap-3">
          <OrganizationSwitcher hidePersonal />
          <UserButton />
        </div>
      </header>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Vous êtes connecté</h2>
        {orgId ? (
          <p className="mt-2 text-muted-foreground">Organisation active : {orgId}</p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            Aucune organisation active. Créez-en une avec le sélecteur en haut à droite : c&apos;est
            elle qui isole les données de votre entreprise.
          </p>
        )}
      </section>
    </main>
  )
}
