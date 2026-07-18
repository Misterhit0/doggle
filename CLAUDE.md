---
title: CLAUDE.md — Guide de Développement
tags:
  - woofyz
  - documentation
  - developer-guide
aliases:
  - Claude Guide
  - CLAUDE
date: 2026-07-15
---

# 🤖 CLAUDE.md — Règles de Développement pour Claude (et tous les assistants IA)

> Ce fichier est lu automatiquement par Claude lors de chaque session dans ce projet.
> Toutes les règles ci-dessous sont **obligatoires** et non négociables.
> Pour les détails techniques, voir [[ARCHITECTURE]], [[BUSINESS_RULES]] et [[DEPLOYMENT_DOCS]].

---

## 🎯 Contexte du Projet

**Woofyz** est une application de matching pour propriétaires de chiens.
- **Stack** : TypeScript, Node.js (Express + tRPC), React (Vite), MySQL (DrizzleORM), PM2
- **Preprod** : https://preprod.woofyz.fr (Direct: http://187.55.227.99:3001) — VPS : `root@187.55.227.99:/var/www/woofyz-preprod`
- **New Preprod (Branding)** : http://187.55.227.99:3002 — VPS : `root@187.55.227.99:/var/www/woofyz-newpreprod`
- **Production** : https://woofyz.fr — VPS : `root@187.55.227.99:/var/www/woofyz`
- **Repo GitHub** : https://github.com/Misterhit0/woofyz

---

## 🛠️ Workflow de Développement OBLIGATOIRE

```
preprod → branche feature → tests → build → merge preprod → deploy VPS → PR → main → prod
```

### Étape 1 — Toujours créer une branche depuis `preprod`
```bash
git checkout preprod
git pull origin preprod
git checkout -b fix/nom-du-bug        # ou feature/nom-de-la-feature
```
**❌ Ne jamais coder directement sur `main` ou `preprod`.**

### Étape 2 — Écrire les tests unitaires
- Toute modification de logique métier **doit** avoir un test dans `server/**/*.test.ts`
- Ne jamais diminuer la couverture de tests existante
- Tests mock-friendly : gérer l'absence de DB avec `try/catch` (voir tests existants)

### Étape 3 — Valider localement
```bash
pnpm test --run   # DOIT passer à 100%
pnpm build        # DOIT compiler sans erreur
```

### Étape 4 — Commit, push, merge preprod
```bash
git add .
git commit -m "fix: description claire"
git push -u origin fix/nom-du-bug

git checkout preprod
git merge fix/nom-du-bug
git push origin preprod
```

### Étape 5 — Déployer sur le VPS preprod
```bash
ssh root@187.55.227.99 "cd /var/www/woofyz-preprod && git pull origin preprod && pnpm install --frozen-lockfile && pnpm build && pm2 restart woofyz-preprod"
```
**Vérifier manuellement sur http://187.55.227.99:3001 ou https://preprod.woofyz.fr**

### Étape 6 — PR vers `main` (Production)
```bash
gh pr create --base main --head preprod --title "Release: ..."
```
ou via GitHub : https://github.com/Misterhit0/woofyz/compare/main...preprod

**Les scripts automatisés :**
- `./deploy_preprod.sh` — effectue les étapes 1→5 interactivement
- `./deploy_main.sh` — effectue l'étape 6 + déploiement production

---

## 🏗️ Architecture & Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `server/routers.ts` | Routes tRPC (auth, user, dog, discovery, match, message) |
| `server/db.ts` | Toutes les fonctions d'accès DB (DrizzleORM + mysql2 pool) |
| `server/_core/index.ts` | Middleware Express (cors, helmet, rate-limit, session) |
| `drizzle/schema.ts` | Schéma de la base de données (source de vérité) |
| `client/src/pages/` | Pages React |
| `client/src/_core/hooks/useAuth.ts` | Hook d'authentification |
| `server/woofmatch.test.ts` | Tests unitaires principaux |

---

## 🔑 Règles Techniques Importantes

### Base de Données
- **Toujours** utiliser `getPool()` pour les requêtes SQL complexes (JOIN, COUNT, etc.)
- **Toujours** utiliser `CAST(id AS UNSIGNED)` pour les IDs dans les SELECT (mysql2 retourne BigInt sinon)
- **Ne jamais** avoir des colonnes dupliquées dans un SELECT (alias + nom brut)
- DrizzleORM est utilisé pour les opérations simples (insert, select par ID)

### Comparaison d'IDs
```typescript
// ✅ TOUJOURS faire ça pour comparer des IDs venant de SQL
const isUser1 = Number(match.user1Id) === Number(user?.id);

// ❌ NE JAMAIS faire ça (mysql2 BigInt vs JS number échoue)
const isUser1 = match.user1Id === user?.id;
```

### API tRPC
- Routes protégées : utiliser `protectedProcedure` (vérifie `ctx.user`)
- Routes publiques : utiliser `publicProcedure`
- Toujours renvoyer des données JSON sérialisables (pas de Date brut, pas de BigInt)

### Gestion d'erreurs
- Ne jamais lancer une `TRPCError` qui annule une transaction si les données sont optionnelles
- Utiliser des valeurs par défaut (ex: `compatibilityScore = 50`) si un champ manque
- Logger toutes les erreurs avec `console.error("[Module] Failed to...", error)`

### Sécurité
- Rate limiting : 200 requêtes / 15 min (global), 5 / 1 min (auth)
- Headers sécurité : helmet, CORS strict
- Sessions : `SameSite: Lax`, `HttpOnly: true`
- `app.set("trust proxy", true)` est requis (derrière Nginx)

---

## 🚀 Déploiement VPS

### Infrastructure
### Infrastructure
- **VPS IP** : `187.55.227.99`
- **Gestionnaire process** : PM2
  - `woofyz` → production (`/var/www/woofyz`, branche `main`)
  - `woofyz-preprod` → preprod (`/var/www/woofyz-preprod`, branche `preprod`)
  - `woofyz-newpreprod` → newpreprod (`/var/www/woofyz-newpreprod`, branche `feature/new-branding-identity`, Port 3002)
- **Reverse proxy** : Nginx
- **Git configuré** sur les dossiers VPS (git pull = déploiement)

### Commandes utiles VPS
```bash
# Logs preprod
ssh root@187.55.227.99 "pm2 logs woofyz-preprod --lines 50"

# Logs production
ssh root@187.55.227.99 "pm2 logs woofyz --lines 50"

# Redémarrer preprod
ssh root@187.55.227.99 "pm2 restart woofyz-preprod"

# Redémarrer production
ssh root@187.55.227.99 "pm2 restart woofyz"

# Déployer preprod (git pull)
ssh root@187.55.227.99 "cd /var/www/woofyz-preprod && git pull origin preprod && pnpm install --frozen-lockfile && pnpm build && pm2 restart woofyz-preprod"

# Déployer production (git pull)
ssh root@187.55.227.99 "cd /var/www/woofyz && git pull origin main && pnpm install --frozen-lockfile && pnpm build && pm2 restart woofyz"
```

---

## 🧪 Tests

```bash
pnpm test --run      # Exécution unique (CI)
pnpm test            # Mode watch (développement)
```

### Écriture des tests
```typescript
// Pattern standard pour tests avec DB non disponible
it("should do X", async () => {
  const { ctx } = createAuthContext();
  const caller = appRouter.createCaller(ctx);
  try {
    const result = await caller.module.procedure(input);
    expect(result).toBeDefined();
  } catch (error: any) {
    // DB non disponible en environnement test
    expect(error.message).toBeDefined();
  }
});
```

---

## 📝 Conventions de Commit

```
feat: ajout d'une nouvelle fonctionnalité
fix: correction d'un bug
refactor: refactoring sans changement fonctionnel
test: ajout ou modification de tests
chore: maintenance, dépendances, config
docs: documentation seulement
security: correction de faille de sécurité
```

---

## 📌 Comptes de Test

| Environnement | Email | Mot de passe | Rôle |
|--------------|-------|--------------|------|
| Preprod / NewPreprod | contact@woofyz.com | doggle2026 | admin |

---

## ⚠️ Pièges Connus

1. **BigInt MySQL** : mysql2 peut retourner des `BigInt` pour les colonnes INT/BIGINT. Toujours utiliser `Number()` ou `CAST(... AS UNSIGNED)` dans les requêtes
2. **Colonnes SQL dupliquées** : un alias et le nom brut dans le même SELECT → le brut écrase l'alias dans l'objet résultat
3. **Trust proxy** : indispensable derrière Nginx pour que rate-limit lise la bonne IP
4. **pnpm test sans `--run`** : reste en mode watch et bloque le terminal en CI
5. **healStuckMatches()** : appelé au boot pour réparer les swipes mutuels sans match. Ne pas supprimer
