import { Document, Font, Image, Page, Text, View } from "@react-pdf/renderer"

import { dayKey, formatDayKey, formatTime } from "@/lib/dates"
import { formatAmount, formatFCFA } from "@/lib/money"
import type { MonthlyReport } from "@/server/reports/monthly"

import { DailyBars, Kpi, Section, Table, formatChange, type Cell } from "./parts"
import { COLORS, styles } from "./styles"

// Whole words only: a French word cut with an English hyphenation rule ("re-trait") reads badly.
Font.registerHyphenationCallback((word) => [word])

const signed = (amount: number) => `${amount > 0 ? "+" : ""}${formatFCFA(amount)}`
const gapColor = (amount: number) => (amount < 0 ? COLORS.danger : amount > 0 ? COLORS.primary : undefined)

// The monthly report as a PDF document (A4). `logo`: the brand logo as PNG bytes, or null to
// leave the tile empty rather than fail the whole report.
export function MonthlyReportDocument({ report, logo }: { report: MonthlyReport; logo: Buffer | null }) {
  const { stats, closings, reconciliation } = report
  const isAgent = report.role === "AGENT"
  const activeDays = stats.daily.filter((day) => day.count > 0).length
  const best = [...stats.daily].sort((a, b) => b.volume - a.volume)[0]

  return (
    <Document title={`AfriSaytu - Rapport mensuel ${report.monthLabel}`} author="AfriSaytu" creator="AfriSaytu" language="fr">
      <Page size="A4" style={styles.page}>
        <View style={styles.band}>
          <View style={styles.logoTile}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- a PDF image has no alt attribute */}
            {logo && <Image src={{ data: logo, format: "png" }} style={styles.logo} />}
          </View>
          <View>
            <Text style={styles.bandTitle}>Rapport mensuel</Text>
            <Text style={styles.bandMonth}>{report.monthLabel.charAt(0).toUpperCase() + report.monthLabel.slice(1)}</Text>
            <Text style={styles.bandText}>{[report.organizationName, report.scopeLabel].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>
        {report.inProgress && (
          <Text style={styles.note}>Mois en cours : chiffres du 1er au {formatDayKey(report.lastDay)}, comparés aux mêmes jours du mois précédent.</Text>
        )}

        <View style={styles.kpis}>
          <Kpi main label="Volume" value={formatFCFA(stats.volume)} hint={`${formatChange(stats.volumeChange)} vs mois précédent`} />
          <Kpi label="Commissions" value={formatFCFA(stats.commission)} hint={`${formatChange(stats.commissionChange)} vs mois précédent`} />
          <Kpi label="Opérations" value={formatAmount(stats.count)} hint={`${formatChange(stats.countChange)} · ${report.cancelled} annulée${report.cancelled > 1 ? "s" : ""}`} />
          <Kpi label="Commission moyenne" value={formatFCFA(stats.averageCommission)} hint="par opération" />
        </View>
        {stats.dailyCommission > 0 && (
          <Text style={styles.small}>
            Dont {formatFCFA(stats.dailyCommission)} de commissions du jour (opérateurs payés sur le total des dépôts et retraits de la journée{isAgent ? ", celles de votre point de vente" : ""}).
          </Text>
        )}

        <Section title="Par opérateur">
          {stats.operators.length === 0 ? <Text style={styles.muted}>Aucune opération ce mois-ci.</Text> : (
            <Table
              columns={[{ title: "Opérateur", flex: 3 }, { title: "Volume", flex: 2, numeric: true }, { title: "Part", flex: 1, numeric: true }, { title: "Commissions", flex: 2, numeric: true }]}
              rows={stats.operators.map((operator): Cell[] => [
                { text: operator.name, dot: operator.color }, { text: formatFCFA(operator.volume) }, { text: `${operator.percent} %` }, { text: formatFCFA(operator.commission) },
              ])}
              total={[{ text: "Total" }, { text: formatFCFA(stats.volume) }, { text: "100 %" }, { text: formatFCFA(stats.commission) }]}
            />
          )}
        </Section>

        <Section title="Par type d'opération">
          {stats.types.length === 0 ? <Text style={styles.muted}>Aucune opération ce mois-ci.</Text> : (
            <Table
              columns={[{ title: "Type", flex: 3 }, { title: "Opérations", flex: 1.5, numeric: true }, { title: "Volume", flex: 2, numeric: true }, { title: "Part", flex: 1, numeric: true }]}
              rows={stats.types.map((type): Cell[] => [{ text: type.label }, { text: formatAmount(type.count) }, { text: formatFCFA(type.volume) }, { text: `${type.percent} %` }])}
            />
          )}
        </Section>

        <Section title="Jour par jour">
          <DailyBars days={stats.daily} />
          <Text style={styles.small}>
            {activeDays} jour{activeDays > 1 ? "s" : ""} d&apos;activité{best && best.volume > 0 ? ` · meilleur jour : ${formatDayKey(best.key)} (${formatFCFA(best.volume)})` : ""}.
          </Text>
        </Section>

        <Section title="Clôtures">
          <Text>
            {closings.count} clôture{closings.count > 1 ? "s" : ""} validée{closings.count > 1 ? "s" : ""}, dont {closings.withGap} avec écart · écart total :{" "}
            <Text style={[styles.bold, { color: gapColor(closings.totalDifference) }]}>{signed(closings.totalDifference)}</Text>
            {closings.reopened > 0 ? ` · ${closings.reopened} réouverte${closings.reopened > 1 ? "s" : ""}` : ""}
          </Text>
          {closings.largest.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Table
                columns={[{ title: "Date", flex: 1.6 }, { title: "Point de vente", flex: 2 }, { title: "Compte", flex: 2 }, { title: "Écart", flex: 1.6, numeric: true }, { title: "Justification", flex: 3.5 }]}
                rows={closings.largest.map((gap): Cell[] => [
                  { text: formatDayKey(dayKey(gap.closedAt)) }, { text: gap.branchName }, { text: gap.accountLabel },
                  { text: signed(gap.difference), color: gapColor(gap.difference) }, { text: gap.justification ?? "—" },
                ])}
              />
            </View>
          )}
        </Section>

        {reconciliation && (
          <Section title="Rapprochement des commissions">
            {reconciliation.lines.length === 0 ? <Text style={styles.muted}>Aucune commission estimée ni reçue ce mois-ci.</Text> : (
              <Table
                columns={[{ title: "Opérateur", flex: 3 }, { title: "Estimé", flex: 2, numeric: true }, { title: "Reçu", flex: 2, numeric: true }, { title: "Écart", flex: 2, numeric: true }]}
                rows={reconciliation.lines.map((line): Cell[] => [
                  { text: line.name, dot: line.color }, { text: formatFCFA(line.estimated) }, { text: formatFCFA(line.received) }, { text: signed(line.gap), color: gapColor(line.gap) },
                ])}
                total={[{ text: "Total" }, { text: formatFCFA(reconciliation.estimated) }, { text: formatFCFA(reconciliation.received) }, { text: signed(reconciliation.gap), color: gapColor(reconciliation.gap) }]}
              />
            )}
            <Text style={styles.small}>Reçu : versements de commissions enregistrés dans la Caisse pour ce mois. Un écart négatif signifie qu&apos;il manque de l&apos;argent.</Text>
          </Section>
        )}

        {stats.agents && stats.agents.length > 0 && (
          <Section title="Agents">
            <Table
              columns={[{ title: "#", flex: 0.5 }, { title: "Membre", flex: 3 }, { title: "Opérations", flex: 1.5, numeric: true }, { title: "Volume", flex: 2, numeric: true }, { title: "Commissions", flex: 2, numeric: true }]}
              rows={stats.agents.map((agent, index): Cell[] => [
                { text: String(index + 1) }, { text: agent.name }, { text: formatAmount(agent.count) }, { text: formatFCFA(agent.volume) }, { text: formatFCFA(agent.commission) },
              ])}
            />
            <Text style={styles.small}>Commissions par opération seulement : la commission du jour appartient au point de vente.</Text>
          </Section>
        )}

        <View style={styles.footer} fixed>
          <Text>AfriSaytu · Rapport mensuel · {report.monthLabel} · créé le {formatDayKey(dayKey(report.generatedAt))} à {formatTime(report.generatedAt)} par {report.authorName}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
