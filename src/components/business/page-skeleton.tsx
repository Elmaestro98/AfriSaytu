// Shown instantly while a screen loads (slow networks): the shape of a page, never a blank
// or a blocking spinner.
export function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Chargement">
      <div className="h-16 border-b bg-card lg:h-20" />
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 lg:mx-0 lg:max-w-6xl lg:px-8 lg:py-8">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-muted" />
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
        </div>
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  )
}
