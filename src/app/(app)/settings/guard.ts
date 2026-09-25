import { revalidatePath } from "next/cache"

import { SessionError } from "@/server/auth/session"
import type { ActionResult } from "@/server/result"

// Common wrapper of the settings Server Actions: turns thrown errors into a French message,
// and refreshes the page on success.
export async function runSettingsAction(
  path: string,
  work: () => Promise<ActionResult>,
): Promise<ActionResult> {
  try {
    const result = await work()
    if (result.ok) revalidatePath(path)
    return result
  } catch (error) {
    if (error instanceof SessionError) {
      return { ok: false, error: "Accès refusé. Reconnectez-vous." }
    }
    console.error(`Settings action failed on ${path}`, error)
    return { ok: false, error: "L'action a échoué. Réessayez dans un instant." }
  }
}

export function firstIssue(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Formulaire invalide"
}
