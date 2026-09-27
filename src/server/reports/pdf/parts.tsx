import { Text, View } from "@react-pdf/renderer"
import type { ReactNode } from "react"

import { formatFCFA } from "@/lib/money"
import type { DayTotals } from "@/server/stats/compute"

import { COLORS, styles } from "./styles"

// Building blocks of the monthly report PDF.

const NBSP = " "

// +12 %, -5 %, or "—" when there is nothing to compare with.
export function formatChange(change: number | null): string {
  if (change === null) return "—"
  return `${change > 0 ? "+" : ""}${change}${NBSP}%`
}

export function Section({ title, children, breakBefore = false }: { title: string; children: ReactNode; breakBefore?: boolean }) {
  return (
    <View style={styles.section} break={breakBefore} wrap={false}>
      <Text style={styles.h2}>{title}</Text>
      {children}
    </View>
  )
}

export function Kpi({ label, value, hint, main = false }: { label: string; value: string; hint?: string; main?: boolean }) {
  return (
    <View style={main ? [styles.kpi, styles.kpiMain] : styles.kpi}>
      <Text style={main ? [styles.kpiLabel, { color: COLORS.white }] : styles.kpiLabel}>{label}</Text>
      <Text style={main ? [styles.kpiValue, { color: COLORS.white }] : styles.kpiValue}>{value}</Text>
      {hint && <Text style={main ? [styles.kpiHint, { color: COLORS.white }] : styles.kpiHint}>{hint}</Text>}
    </View>
  )
}

export type Column = { title: string; flex: number; numeric?: boolean }
export type Cell = { text: string; color?: string; dot?: string | null; bold?: boolean }

// A simple table: header, rows, optional total row. `dot` puts an operator colour before a name.
export function Table({ columns, rows, total }: { columns: readonly Column[]; rows: readonly (readonly Cell[])[]; total?: readonly Cell[] }) {
  const cell = (item: Cell, column: Column, key: number) => (
    <View key={key} style={[styles.td, { flex: column.flex }, item.dot !== undefined ? styles.nameCell : {}]}>
      {item.dot !== undefined && <View style={[styles.dot, { backgroundColor: item.dot ?? COLORS.primary }]} />}
      <Text style={[column.numeric ? styles.num : {}, item.bold ? styles.bold : {}, item.color ? { color: item.color } : {}]}>{item.text}</Text>
    </View>
  )
  return (
    <View style={styles.table}>
      <View style={styles.headRow}>
        {columns.map((column) => (
          <Text key={column.title} style={[styles.th, { flex: column.flex }, column.numeric ? styles.num : {}]}>{column.title}</Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.row} wrap={false}>
          {row.map((item, key) => cell(item, columns[key], key))}
        </View>
      ))}
      {total && (
        <View style={styles.totalRow} wrap={false}>
          {total.map((item, key) => cell({ ...item, bold: true }, columns[key], key))}
        </View>
      )}
    </View>
  )
}

// Daily volume as bars (no chart library in a PDF): first, middle and last day under the axis.
export function DailyBars({ days }: { days: readonly DayTotals[] }) {
  const highest = Math.max(0, ...days.map((day) => day.volume))
  const max = highest || 1 // an empty month draws no bar, never divides by zero
  const labels = [days[0], days[Math.floor((days.length - 1) / 2)], days.at(-1)].filter((day): day is DayTotals => Boolean(day))
  return (
    <View>
      <View style={styles.chart}>
        {days.map((day) => (
          <View key={day.key} style={[styles.bar, { height: `${day.volume > 0 ? Math.max((day.volume / max) * 100, 2) : 0}%` }]} />
        ))}
      </View>
      <View style={styles.chartAxis}>
        {labels.map((day) => <Text key={day.key}>{Number(day.key.slice(8, 10))}</Text>)}
      </View>
      <Text style={styles.small}>Volume par jour. Plus haute barre : {formatFCFA(highest)}.</Text>
    </View>
  )
}
