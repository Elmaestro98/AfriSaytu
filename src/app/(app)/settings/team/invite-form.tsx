"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState, useTransition } from "react"
import { Controller, useForm } from "react-hook-form"

import { FieldError } from "@/components/business/field-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { roleLabel } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { inviteMemberSchema, type InviteMemberInput } from "@/schemas/team"
import type { BranchOption } from "@/server/team/queries"

import { inviteMemberAction } from "./actions"

type InviteFormProps = {
  branches: readonly BranchOption[]
  roles: readonly InviteMemberInput["role"][]
}

export function InviteForm({ branches, roles }: InviteFormProps) {
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: roles[0],
      branchIds: branches.length === 1 ? [branches[0].id] : [],
    },
  })
  const { register, control, handleSubmit, reset, formState } = form

  const submit = (values: InviteMemberInput) => {
    setMessage(null)
    startTransition(async () => {
      const result = await inviteMemberAction(values)
      if (result.ok) {
        setMessage({ kind: "ok", text: `Invitation envoyée à ${values.email}.` })
        reset({ ...values, email: "" })
      } else {
        setMessage({ kind: "error", text: result.error })
      }
    })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-5 rounded-xl border bg-card p-4"
    >
      <div>
        <h2 className="font-heading text-xl font-bold">Inviter un membre</h2>
        <p className="text-sm text-muted-foreground">
          La personne reçoit un e-mail pour créer son accès.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="invite-email">Adresse e-mail</Label>
        <Input
          id="invite-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="agent@exemple.com"
          className="h-12 text-base"
          {...register("email")}
        />
        <FieldError message={formState.errors.email?.message} />
      </div>

      {roles.length > 1 && (
        <Controller
          control={control}
          name="role"
          render={({ field }) => (
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Rôle">
              <Label>Rôle</Label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    role="radio"
                    aria-checked={field.value === role}
                    variant={field.value === role ? "default" : "outline"}
                    className="h-12 text-base"
                    onClick={() => field.onChange(role)}
                  >
                    {roleLabel(role)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        />
      )}

      <Controller
        control={control}
        name="branchIds"
        render={({ field }) => (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Points de vente</legend>
            {branches.map((branch) => {
              const checked = field.value.includes(branch.id)
              return (
                <label
                  key={branch.id}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg border-2 px-3 text-base",
                    checked ? "border-primary bg-accent" : "border-border",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    checked={checked}
                    onChange={() =>
                      field.onChange(
                        checked ? field.value.filter((id) => id !== branch.id) : [...field.value, branch.id],
                      )
                    }
                  />
                  {branch.name}
                </label>
              )
            })}
            <FieldError message={formState.errors.branchIds?.message} />
          </fieldset>
        )}
      />

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-lg p-3 text-sm font-medium",
            message.kind === "error" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground",
          )}
        >
          {message.text}
        </p>
      )}

      <Button type="submit" className="h-12 text-base" disabled={isPending}>
        {isPending ? "Envoi…" : "Envoyer l'invitation"}
      </Button>
    </form>
  )
}
