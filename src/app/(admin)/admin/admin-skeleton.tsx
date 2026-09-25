// Shown at once while an admin page loads: the database answers in a few seconds on a cold start,
// and a click that shows nothing looks broken.
export function AdminSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement">
      <div className="h-9 w-1/3 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((key) => <div key={key} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}
