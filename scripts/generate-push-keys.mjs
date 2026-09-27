// Creates the secrets of the push notifications and writes them into .env.local (ignored by git),
// without printing the private ones. Run once: node scripts/generate-push-keys.mjs
// Then copy the three values into Vercel (Settings -> Environment Variables).
import { appendFileSync, existsSync, readFileSync } from "node:fs"
import { randomBytes } from "node:crypto"
import webpush from "web-push"

const FILE = ".env.local"
const current = existsSync(FILE) ? readFileSync(FILE, "utf8") : ""
const has = (name) => new RegExp(`^${name}=`, "m").test(current)

const lines = []
if (!has("VAPID_PUBLIC_KEY") && !has("VAPID_PRIVATE_KEY")) {
  const keys = webpush.generateVAPIDKeys()
  lines.push(`VAPID_PUBLIC_KEY=${keys.publicKey}`, `VAPID_PRIVATE_KEY=${keys.privateKey}`)
}
if (!has("CRON_SECRET")) lines.push(`CRON_SECRET=${randomBytes(32).toString("base64url")}`)

if (lines.length === 0) {
  console.log(`${FILE} contient déjà les clés : rien à faire.`)
} else {
  appendFileSync(FILE, `${current && !current.endsWith("\n") ? "\n" : ""}\n# Notifications push (scripts/generate-push-keys.mjs)\n${lines.join("\n")}\n`)
  console.log(`Ajouté dans ${FILE} : ${lines.map((line) => line.split("=")[0]).join(", ")} (valeurs non affichées).`)
  console.log("Copiez ces valeurs dans Vercel : Settings -> Environment Variables, puis redéployez.")
}
