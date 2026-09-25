import { Download } from "lucide-react"

import { historyQueryString, type HistoryFilters } from "@/lib/history-filters"

// Downloads the operations matching the current filters (F-53). Plain links: the browser saves
// the file; the server checks rights, plan and records the export in the audit log.
export function ExportLinks({ filters }: { filters: HistoryFilters }) {
  const query = historyQueryString(filters)
  const href = (format: "csv" | "xlsx") => `/api/export/operations${query ? `${query}&` : "?"}format=${format}`

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Exporter</span>
      <a href={href("xlsx")} download className="flex h-11 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-semibold hover:bg-accent">
        <Download className="size-4" aria-hidden /> Excel
      </a>
      <a href={href("csv")} download className="flex h-11 items-center gap-1.5 rounded-xl border bg-card px-3 text-sm font-semibold hover:bg-accent">
        <Download className="size-4" aria-hidden /> CSV
      </a>
    </div>
  )
}
