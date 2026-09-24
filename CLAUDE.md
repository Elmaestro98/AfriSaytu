# AfriSaytu — Contrat de session

SaaS multi-tenant de gestion pour les agents et points de transfert d'argent au Sénégal
(Orange Money, Wave, Mixx by Yas).

> **Le produit ne détient aucun fonds et n'exécute aucun transfert.** L'agent réalise
> l'opération sur le canal officiel de l'opérateur, puis l'enregistre ici. AfriSaytu est un
> logiciel de suivi, de calcul et d'analyse. Ne jamais proposer de code qui déplace de
> l'argent réel, crée un portefeuille électronique ou appelle une API d'opérateur.

Référence complète : `docs/cahier-des-charges-v2.1.pdf`. En cas de contradiction entre ce
fichier et le cahier des charges, c'est le cahier des charges qui fait foi ; signale-moi
l'écart.

---

## 1. Stack

| Couche | Choix |
| --- | --- |
| Framework | Next.js (App Router), React Server Components par défaut |
| Langage | TypeScript strict |
| UI | Tailwind CSS + shadcn/ui (Radix). **Pas de daisyUI, pas de MUI, pas de Bootstrap** |
| Formulaires | React Hook Form + Zod (schémas partagés client/serveur) |
| Base de données | PostgreSQL (Supabase) + Prisma |
| Auth | Clerk avec Organizations |
| Graphiques | Recharts |
| État client | Zustand, uniquement si un état ne peut pas vivre dans l'URL ou le serveur |
| Exports | ExcelJS ; CSV en UTF-8 avec BOM |
| Hébergement | Vercel |
| Erreurs | Sentry |

### Conventions d'environnement

- `DATABASE_URL` : pooler Supabase, port **6543**, avec `?pgbouncer=true`.
- `DIRECT_URL` : connexion directe, port **5432** (migrations Prisma).
- Middleware Clerk v6 nommé `src/proxy.js`.
- Aucun secret dans le code ni dans un fichier versionné.

---

## 2. Règles d'or

1. **Isolation multi-tenant.** Toute table métier porte `organizationId`. Cet identifiant
   vient **toujours** de la session Clerk côté serveur, jamais d'un paramètre client, d'un
   champ de formulaire ou d'une query string. Toute requête passe par la couche d'accès qui
   ajoute le filtre automatiquement.
2. **Montants en entiers.** Le franc CFA n'a pas de centimes. `Int` en Prisma, `number`
   entier en TS. **Jamais de `Float`, jamais de `parseFloat` sur un montant.** Les
   pourcentages sont stockés en points de base (`150` = 1,5 %).
3. **Grand livre.** Un solde n'est jamais écrit directement : il est la somme des lignes de
   `LedgerEntry` (+ solde d'ouverture). Une opération et ses lignes de mouvement s'écrivent
   dans **une seule transaction SQL** (`prisma.$transaction`) : tout ou rien.
4. **Immuabilité.** Une opération validée n'est jamais modifiée ni supprimée. Correction =
   annulation avec motif (contre-passation des lignes) puis nouvelle saisie. Pas de
   `delete` sur `Transaction`, `LedgerEntry`, `DailyClosing`, `AuditLog`.
5. **Commission figée.** À la saisie, la commission calculée et le `commissionRuleId`
   utilisé sont stockés sur l'opération. Modifier une règle ne recalcule **jamais** le
   passé.
6. **Vérification serveur.** Les permissions sont contrôlées dans chaque Server Action et
   Route Handler. Cacher un bouton dans l'UI n'est pas un contrôle d'accès.
7. **Fuseau.** Africa/Dakar. Horodatage serveur ; l'heure du téléphone est conservée
   séparément (`clientCreatedAt`) à titre informatif.

---

## 3. Règles métier à respecter dans le code

### Impact des opérations sur les soldes

| Type | Solde opérateur (UV) | Caisse espèces |
| --- | --- | --- |
| `DEPOSIT` (dépôt / cash-in) | − montant | + montant (+ frais si encaissés en espèces) |
| `WITHDRAWAL` (retrait / cash-out) | + montant | − montant |
| `SEND` (envoi) | − montant | + montant + frais client |
| `AIRTIME` (achat crédit) | − montant | + montant |
| `BILL` (paiement facture) | − montant | + montant + frais éventuels |
| `OTHER` | choix manuel | choix manuel |

Cette matrice est **configurable par opérateur** : elle est lue depuis la configuration, pas
codée en dur dans les composants. La logique vit dans un module unique
(`src/server/ledger/effects.ts`), pas dupliquée dans l'UI.

### Mouvements internes (sans client)

`UV_TOPUP` (+ UV / − espèces), `UV_SELL` (− UV / + espèces), `CASH_IN` (+ espèces),
`CASH_OUT` (− espèces), `TRANSFER` (entre deux comptes), `COMMISSION_PAYOUT`
(commission réellement reçue de l'opérateur, pour rapprochement).

### Calcul de la commission

```
commission = fixedFee + (amount * percentage / 10_000)
commission = max(commission, minCommission ?? 0)
commission = min(commission, cap ?? commission)
commission = arrondi(commission)   // règle d'arrondi configurable
```

- Une règle vaut pour : organisation + opérateur + type + tranche `[minAmount, maxAmount]`.
- Les tranches d'un même couple opérateur/type **ne doivent pas se chevaucher** : contrôle
  bloquant à l'enregistrement de la règle.
- Aucune règle correspondante → commission = 0 et opération marquée « sans règle ».
- `fee` (frais payés par le client) et `commission` (gain de l'agent) sont **deux champs
  distincts**. Ne jamais les confondre ni les additionner.
- Aucun tarif d'opérateur n'est codé en dur. Tous les barèmes viennent de la base.

### Clôture

Soldes constatés saisis → écart = constaté − théorique → justification obligatoire
au-delà du seuil → validation → **journée verrouillée** (aucune opération rattachable) →
l'écart devient une ligne d'ajustement et le solde constaté devient le solde d'ouverture du
lendemain. Réouverture réservée au gérant, avec motif, tracée dans `AuditLog`.

### Doublons et idempotence

Même opérateur + type + montant + numéro client dans les 3 dernières minutes → demande de
confirmation. Chaque saisie porte une clé d'idempotence générée côté client, pour absorber
les renvois réseau sans créer de doublon. `reference` est unique par opérateur au sein de
l'organisation quand elle est renseignée.

---

## 4. Modèle de données

Entités principales : `Organization`, `Branch`, `Member`, `OperatorCatalog`, `OrgOperator`,
`Account`, `Transaction`, `LedgerEntry`, `InternalMovement`, `CommissionRule`,
`DailyClosing`, `ClosingLine`, `Subscription`, `Payment`, `AuditLog`.

Le schéma détaillé est en section 9 du cahier des charges. Règles :

- `organizationId` sur **toutes** les tables métier, `CommissionRule` comprise.
- Index sur `(organizationId, createdAt)` et `(organizationId, reference)` pour
  `Transaction`.
- Migration Prisma pour tout changement de schéma ; jamais de modification manuelle en
  base.

### Rôles

`OWNER` (propriétaire : abonnement, facturation, tous droits), `MANAGER` (gérant : ses
points de vente), `AGENT` (son point de vente, ses opérations), plus l'`Admin SaaS` côté
console interne. Matrice complète en section 5 du cahier des charges. Un agent peut annuler
sa propre opération dans les 15 minutes, avec motif.

---

## 5. Organisation du code

```
src/
  app/(auth)/...
  app/(app)/dashboard|operations|accounts|closing|history|stats|settings/
  app/(admin)/...                 # console Admin SaaS
  components/ui/                  # shadcn générés, non modifiés sans raison
  components/business/            # tuiles opérateurs, pavé numérique, comptage billets
  server/
    auth/          # contexte session, helpers de rôle
    db/            # client Prisma + extension de filtrage par organisation
    ledger/        # effects.ts, postings.ts, balances.ts
    commissions/   # resolve.ts, compute.ts
    closing/
    audit/
  lib/             # money.ts, phone.ts, dates.ts, format.ts
  schemas/         # schémas Zod partagés
```

- Un module serveur par domaine métier ; l'UI n'appelle jamais Prisma directement.
- Server Components par défaut ; `"use client"` isolé dans les feuilles interactives, pour
  ne pas casser `await auth()` dans les composants serveur.

---

## 6. Style de code

- Nommage : code, variables et commentaires en anglais ; libellés d'interface en français.
- Composants React : fonctions nommées, props typées explicitement, pas de `any`.
- Formatage des montants uniquement via `lib/money.ts` (`formatFCFA(1250000)` →
  `1 250 000 FCFA`). Jamais de `toLocaleString` dispersé dans les composants.
- Numéros de téléphone : validation et formatage via `lib/phone.ts` (9 chiffres, format
  sénégalais). Masquage partiel à l'affichage pour les agents : `77 *** ** 34`.
- Fichiers courts. Au-delà de ~200 lignes, découper.
- Pas de dépendance nouvelle sans me demander d'abord.

## 7. UI

Mobile-first, pensée pour un Android d'entrée de gamme sur écran de 360 px, utilisée d'une
main et en plein soleil.

- Couleurs : primaire `#0B5D4B`, accent `#F2A900`. Palette à fort contraste via les
  variables CSS du thème ; couleur par opérateur issue du thème, jamais codée en dur.
- Zones tactiles d'au moins 44 px. Chiffres gros et gras.
- L'écran de saisie est l'écran critique : objectif **moins de 10 secondes**. Opérateur et
  type présélectionnés sur les derniers utilisés, clavier numérique, montants rapides,
  champs optionnels repliés, validation en un geste.
- Pas d'écran de chargement bloquant sur le tableau de bord : squelettes et streaming.

## 8. Tests

- Tests unitaires obligatoires sur `commissions/` et `ledger/` : bornes de tranches,
  plafond, minimum, arrondi, absence de règle, chaque type de la matrice.
- Test d'invariant : après toute séquence d'opérations et d'annulations, la somme des
  `LedgerEntry` d'un compte est égale au solde affiché.
- Tests d'isolation multi-tenant sur chaque Server Action : un membre de l'organisation A ne
  lit ni ne modifie aucune donnée de B.

## 9. Sécurité et données personnelles

Les numéros de clients sont des données personnelles (loi sénégalaise n° 2008-12, CDP).
Minimisation : le numéro client reste optionnel. Masquage à l'affichage. Journalisation dans
`AuditLog` de toute action sensible : annulation, réouverture de clôture, modification de
règle de commission, changement de rôle, export.

## 10. Commandes

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npx prisma migrate dev --name <nom>
npx prisma studio
```

## 11. Comment travailler avec moi

- Avant une tâche non triviale, expose ton plan en quelques lignes et attends ma validation.
- Une tâche à la fois. Ne refactorise pas du code non concerné par la demande.
- Si une exigence du cahier des charges est ambiguë, pose la question au lieu d'inventer une
  règle métier.
- Propose des migrations réversibles et signale tout changement de schéma qui touche des
  données existantes.
- Réponds en français.

## 12. Interdits

- Logique métier dupliquée entre l'UI et le serveur.
- `organizationId` reçu du client.
- Écriture directe d'un solde sans ligne de grand livre correspondante.
- Suppression ou modification d'une opération validée.
- Montants en flottant, barèmes d'opérateurs en dur, secrets versionnés.
- Bibliothèque UI concurrente de shadcn/ui.
- Toute fonctionnalité qui détient des fonds, exécute un transfert ou se connecte à un
  compte opérateur (hors périmètre, implications réglementaires).
