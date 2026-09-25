// Result of a Server Action: errors are French messages shown to the user as they are.
export type ActionResult = { ok: true } | { ok: false; error: string }
