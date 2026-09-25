import { formatAmount } from "@/lib/money"
import type { RecapRow } from "@/server/closing/queries"

// Volume and commissions of the period, per operator (mockup 05, F-40).
export function RecapTable({ rows }: { rows: readonly RecapRow[] }) {
  const total = rows.reduce(
    (sum, row) => ({ count: sum.count + row.count, volume: sum.volume + row.volume, commission: sum.commission + row.commission }),
    { count: 0, volume: 0, commission: 0 },
  )

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <h2 className="font-heading text-lg font-bold">Volume et commissions</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune opération depuis la dernière clôture.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="py-2 font-semibold">Opérateur</th>
              <th scope="col" className="py-2 text-right font-semibold">Ops</th>
              <th scope="col" className="py-2 text-right font-semibold">Volume</th>
              <th scope="col" className="py-2 text-right font-semibold">Comm.</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.operatorName}>
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-2.5 rounded-full bg-primary" style={row.color ? { backgroundColor: row.color } : undefined} />
                    {row.operatorName}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{row.count}</td>
                <td className="py-2 text-right tabular-nums">{formatAmount(row.volume)}</td>
                <td className="py-2 text-right font-semibold text-primary tabular-nums">+{formatAmount(row.commission)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary font-bold text-primary-foreground">
              <td className="rounded-l-lg px-2 py-2">Total</td>
              <td className="py-2 text-right tabular-nums">{total.count}</td>
              <td className="py-2 text-right tabular-nums">{formatAmount(total.volume)}</td>
              <td className="rounded-r-lg px-2 py-2 text-right tabular-nums">+{formatAmount(total.commission)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </section>
  )
}
