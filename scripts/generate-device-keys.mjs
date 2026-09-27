// Creates the secrets of the quick agent switch and writes them into .env.local (ignored by git),
// without printing them. Run once: node scripts/generate-device-keys.mjs
// Then copy both values into Vercel (Settings -> Environment Variables) and redeploy.
// Never change PIN_PEPPER afterwards: every agent's code would stop working.
import { appendFileSync, existsSync, readFileSync } from "node:fs"
import { randomBytes } from "node:crypto"

const FILE = ".env.local"
const current = existsSync(FILE) ? readFileSync(FILE, "utf8") : ""
const has = (name) => new RegExp(`^${name}=`, "m").test(current)

const lines = []
for (const name of ["PIN_PEPPER", "ACTOR_COOKIE_SECRET"]) {
  if (!has(name)) lines.push(`${name}=${randomBytes(48).toString("base64url")}`)
}

if (lines.length === 0) {
  console.log(`${FILE} contient déjà les clés : rien à faire.`)
} else {
  appendFileSync(FILE, `${current && !current.endsWith("\n") ? "\n" : ""}\n# Changement rapide d'agent (scripts/generate-device-keys.mjs)\n${lines.join("\n")}\n`)
  console.log(`Ajouté dans ${FILE} : ${lines.map((line) => line.split("=")[0]).join(", ")} (valeurs non affichées).`)
  console.log("Copiez ces valeurs dans Vercel : Settings -> Environment Variables, puis redéployez.")
  console.log("Ne changez jamais PIN_PEPPER ensuite : les codes des agents ne fonctionneraient plus.")
}
