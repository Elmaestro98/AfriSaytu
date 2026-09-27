import { z } from "zod"

// A browser push subscription, as PushSubscription.toJSON() gives it. The endpoint is the push
// service's HTTPS address; the keys are base64url.
const base64url = z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/, "Clé invalide.")

export const pushDeviceSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({ p256dh: base64url.max(256), auth: base64url.max(64) }),
  userAgent: z.string().max(300).nullable().default(null),
})

export type PushDeviceInput = z.infer<typeof pushDeviceSchema>

export const removeDeviceSchema = z.object({ endpoint: z.url({ protocol: /^https$/ }).max(2048) })

export const muteSchema = z.object({ kind: z.string().max(40), muted: z.boolean() })
