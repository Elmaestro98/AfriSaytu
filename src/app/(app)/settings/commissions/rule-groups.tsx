"use client"

import { Ban, Pencil } from "lucide-react"

import { OperatorBadge } from "@/components/business/operator-badge"
import { Button } from "@/components/ui/button"
import { describeCommission, describeFee, describeRange } from "@/lib/format-rule"
import { TYPE_LABELS } from "@/lib/operation-types"
import type { RuleRow } from "@/server/commissions/manage"

type Group = { operatorId: string; name: string; color: string | null; logoSrc: string | null; types: { type: RuleRow["type"]; rules: RuleRow[] }[] }

// Rules in force, one card per operator, one block per operation type, one row per amount band.
function groupRules(rules: readonly RuleRow[]): Group[] {
  const groups = new Map<string, Group>()
  for (const rule of rules) {
    const group = groups.get(rule.operatorId) ?? { operatorId: rule.operatorId, name: rule.operatorName, color: rule.operatorColor, logoSrc: rule.operatorLogoSrc, types: [] }
    const block = group.types.find((entry) => entry.type === rule.type)
    if (block) block.rules.push(rule)
    else group.types.push({ type: rule.type, rules: [rule] })
    groups.set(rule.operatorId, group)
  }
  return [...groups.values()]
}

type RuleGroupsProps = {
  rules: readonly RuleRow[]
  closingId: string | null
  isPending: boolean
  onEdit: (rule: RuleRow) => void
  onAskClose: (ruleId: string | null) => void
  onClose: (ruleId: string) => void
}

export function RuleGroups({ rules, closingId, isPending, onEdit, onAskClose, onClose }: RuleGroupsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
      {groupRules(rules).map((group) => (
        <OperatorRules key={group.operatorId} group={group} closingId={closingId} isPending={isPending}
          onEdit={onEdit} onAskClose={onAskClose} onClose={onClose} />
      ))}
    </div>
  )
}

function OperatorRules({ group, closingId, isPending, onEdit, onAskClose, onClose }: Omit<RuleGroupsProps, "rules"> & { group: Group }) {
  const bands = group.types.reduce((sum, block) => sum + block.rules.length, 0)
  return (
    <section aria-labelledby={`rules-${group.operatorId}`} className="flex flex-col rounded-2xl border bg-card shadow-xs">
      <header className="flex items-center gap-3 border-b p-4">
        <OperatorBadge name={group.name} color={group.color} logoSrc={group.logoSrc} className="size-11" />
        <h2 id={`rules-${group.operatorId}`} className="min-w-0 flex-1 truncate font-heading text-xl font-bold">{group.name}</h2>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
          {bands} tranche{bands > 1 ? "s" : ""}
        </span>
      </header>

      {group.types.map((block) => (
        <div key={block.type} className="border-b px-4 py-3 last:border-b-0">
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{TYPE_LABELS[block.type]}</h3>
          <ul className="divide-y">
            {block.rules.map((rule) => (
              <li key={rule.id} className="py-2.5">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tabular-nums">{describeRange(rule)}</p>
                    <p className="flex flex-wrap gap-x-3 text-sm tabular-nums">
                      <span><span className="text-muted-foreground">Commission </span><span className="font-semibold text-primary">{describeCommission(rule)}</span></span>
                      <span><span className="text-muted-foreground">Frais client </span>{describeFee(rule)}</span>
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-primary"
                    aria-label={`Modifier la tranche ${describeRange(rule)}`} onClick={() => onEdit(rule)}>
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Arrêter la tranche ${describeRange(rule)}`} onClick={() => onAskClose(rule.id)}>
                    <Ban className="size-4" aria-hidden />
                  </Button>
                </div>
                {closingId === rule.id && (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl bg-muted p-3">
                    <p className="text-sm">Les prochaines opérations de cette tranche seront « sans règle » (commission 0).</p>
                    <div className="flex gap-3">
                      <Button type="button" variant="destructive" className="h-11 flex-1" disabled={isPending} onClick={() => onClose(rule.id)}>
                        Arrêter la règle
                      </Button>
                      <Button type="button" variant="outline" className="h-11 flex-1 bg-card" disabled={isPending} onClick={() => onAskClose(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
