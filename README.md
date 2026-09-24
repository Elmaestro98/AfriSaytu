# AfriSaytu

**Le logiciel de caisse des agents de transfert d'argent.**

AfriSaytu permet aux agents et points de transfert d'argent au Sénégal de centraliser leurs
opérations Orange Money, Wave, Mixx by Yas et autres opérateurs : suivi des soldes, calcul
des commissions, gestion de caisse, clôture journalière et rapports.

> *Saytu* signifie « surveiller, contrôler » en wolof.

---

## Ce que fait le produit

- **Saisie rapide** d'une opération en moins de 10 secondes, sur mobile, d'une seule main.
- **Calcul automatique des commissions** selon des barèmes configurables par opérateur, par
  type d'opération et par tranche de montant.
- **Suivi des soldes** : unités électroniques de chaque opérateur et caisse espèces, avec
  alertes de seuil.
- **Clôture journalière** : comparaison des soldes théoriques et constatés, justification
  des écarts, verrouillage de la journée.
- **Supervision** : un gérant suit plusieurs agents et plusieurs points de vente.
- **Statistiques et exports** CSV/Excel pour la comptabilité.

## Ce que le produit ne fait pas

AfriSaytu **ne détient pas les fonds des clients**, ne crée pas de portefeuille
électronique, ne remplace pas les applications des opérateurs et n'exécute aucun transfert.
L'agent réalise l'opération sur le canal officiel de l'opérateur, puis l'enregistre dans
AfriSaytu. C'est un logiciel de gestion, de suivi et d'analyse.

---

## Stack

| Couche | Technologie |
| --- | --- |
| Framework | Next.js (App Router) |
| Langage | TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Base de données | PostgreSQL (Supabase) + Prisma |
| Authentification | Clerk (Organizations) |
| Graphiques | Recharts |
| Hébergement | Vercel |

Architecture **multi-tenant** : chaque entreprise dispose d'un espace isolé. Les soldes sont
calculés à partir d'un grand livre de mouvements, jamais écrits directement.

---

## Démarrage

### Prérequis

- Node.js 20 ou plus
- Un projet Supabase
- Un compte Clerk

### Installation

```bash
git clone <url-du-depot>
cd afrisaytu
npm install
cp .env.example .env.local
```

### Variables d'environnement

```env
# Supabase : pooler pour l'application, connexion directe pour les migrations
DATABASE_URL="postgresql://...@...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...@...supabase.com:5432/postgres"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Base de données et lancement

```bash
npx prisma migrate dev
npx prisma db seed     # opérateurs du catalogue et jeu de données de démonstration
npm run dev
```

L'application est disponible sur http://localhost:3000.

---

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires |
| `npx prisma studio` | Explorateur de base de données |

---

## Structure

```
src/
  app/            # routes (auth, application, console admin)
  components/
    ui/           # composants shadcn
    business/     # tuiles opérateurs, pavé numérique, comptage des billets
  server/
    auth/         # session et rôles
    db/           # Prisma et filtrage par organisation
    ledger/       # effets des opérations sur les soldes
    commissions/  # résolution des règles et calcul
    closing/      # clôture journalière
  lib/            # montants, téléphones, dates, formats
  schemas/        # schémas Zod partagés
docs/             # cahier des charges
```

---

## Concepts clés

| Terme | Signification |
| --- | --- |
| Point de vente | Boutique ou kiosque, avec sa caisse et ses comptes opérateurs |
| UV (float) | Unités électroniques disponibles sur le compte agent d'un opérateur |
| Solde théorique | Solde calculé par le logiciel à partir des mouvements enregistrés |
| Solde constaté | Solde réellement observé, saisi à la clôture |
| Écart | Solde constaté moins solde théorique |
| Frais client | Montant payé par le client pour l'opération |
| Commission agent | Rémunération de l'agent sur l'opération |

Deux principes structurants pour les contributeurs :

1. **Les montants sont des entiers en FCFA.** Aucun flottant, aucun centime.
2. **Une opération validée ne se modifie jamais.** Une erreur se corrige par annulation
   motivée, puis nouvelle saisie ; les deux restent visibles dans l'historique.

---

## Abonnements

| Plan | Prix indicatif | Contenu |
| --- | --- | --- |
| Basic | 2 500 FCFA/mois | 1 point de vente, 1 utilisateur, saisie, caisse et clôture |
| Pro | 5 000 FCFA/mois | Jusqu'à 5 utilisateurs, exports, rapports |
| Business | 10 000 FCFA/mois | Multi-points de vente, permissions avancées |

Essai gratuit de 14 jours. Paiement par Wave et Orange Money.

---

## Documentation

- `docs/cahier-des-charges-v2.1.pdf` — périmètre, règles métier, modèle de données,
  planning. Document de référence du projet.
- `CLAUDE.md` — contrat de développement et règles à respecter dans le code.

---

## Conformité

Les numéros de téléphone des clients sont des données personnelles, traitées conformément à
la loi sénégalaise n° 2008-12 et aux exigences de la Commission de Protection des Données
Personnelles (CDP). Le numéro client reste optionnel et est masqué à l'affichage.

---

## Auteur

**AFRICATECHNOLOGIE / E-DEV** — Saint-Louis / Dakar, Sénégal
africatechnologie9@gmail.com

Projet propriétaire. Tous droits réservés.
