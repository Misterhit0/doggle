# 🏗️ Doggle — Arborescence & Architecture Technique

> Ce document décrit **où se trouve le code** et **comment le projet est structuré**. Pour les règles métier (ce que fait le code), voir [BUSINESS_RULES.md](./BUSINESS_RULES.md). Pour l'inventaire des pages et actions, voir [PAGES.md](./PAGES.md). Pour l'historique des évolutions, voir [../CHANGELOG.md](../CHANGELOG.md).

---

## 📦 Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, Wouter (routing), Radix UI, Framer Motion, Recharts, Sonner, Embla Carousel |
| Backend | Node.js, Express, tRPC v11, TypeScript, bcryptjs, jose (JWT) |
| Base de données | MySQL, Drizzle ORM (+ SQL brut pour certaines fonctionnalités, voir plus bas) |
| Cartographie | MapLibre GL JS + basemaps CartoDB (open source, migré depuis Google Maps) |
| Process manager | PM2 (`doggle` en prod, `doggle-preprod` en préprod) |
| Reverse proxy | Nginx |
| Automatisation | n8n (webhooks → notifications WhatsApp via Twilio) |
| Tests | Vitest |

---

## 🌳 Arborescence du projet

```
woofmatch/
├── CLAUDE.md                    # Règles de dev pour Claude Code (lu automatiquement)
├── AI_INSTRUCTIONS.md           # Mêmes règles, formulées pour tout assistant IA
├── DEPLOYMENT_DOCS.md           # Infra VPS, Nginx, PM2, n8n, CI/CD détaillé
├── CHANGELOG.md                 # Historique des évolutions du projet
├── docs/                        # Documentation fonctionnelle (ce dossier)
│   ├── ARCHITECTURE.md          #   → ce fichier
│   ├── BUSINESS_RULES.md        #   → règles métier par domaine
│   └── PAGES.md                 #   → pages, routes, actions possibles
│
├── deploy_preprod.sh             # Pipeline interactif : test → build → commit → push → merge preprod → deploy VPS
├── deploy_main.sh                # PR preprod → main + déploiement production
│
├── drizzle/                      # Schéma DB (source de vérité) + migrations
│   ├── schema.ts                 #   Tables Drizzle : users, dogs, swipes, matches, messages, notifications, reviews, verifications
│   ├── relations.ts
│   └── migrations/
│
├── shared/                       # Code partagé front/back
│   ├── compatibilityEngine.ts    #   Algorithme de compatibilité chien+maître (voir BUSINESS_RULES.md)
│   ├── const.ts                  #   Constantes partagées (cookie name, durées…)
│   └── types.ts
│
├── server/
│   ├── routers.ts                 # ⭐ Toutes les routes tRPC (auth, user, dog, discovery, match, message, favorite, history, sponsorship, walkingService, events, lostDogs, reviews, verification)
│   ├── db.ts                      # ⭐ Toutes les fonctions d'accès DB (Drizzle + requêtes SQL brutes via mysql2 pool)
│   ├── seed.ts                    # Génération de données de démo
│   ├── *.test.ts                  # Tests unitaires (un fichier par domaine, voir tableau ci-dessous)
│   └── _core/
│       ├── index.ts                # Middleware Express (CORS, headers sécurité, rate limiting, montage tRPC)
│       ├── trpc.ts                 # ⭐ Config tRPC : publicProcedure/protectedProcedure/adminProcedure + rate limiting middleware
│       ├── context.ts              # Construction du contexte tRPC (utilisateur authentifié via cookie/token)
│       ├── cookies.ts              # Options des cookies de session
│       ├── oauth.ts                # Callback OAuth (login SSO)
│       ├── sdk.ts                  # Authentification de requête, création de session token
│       ├── logger.ts               # Logs structurés par domaine (auth.log, swipe.log, match.log, message.log…)
│       ├── storageProxy.ts         # Proxy de stockage fichiers/photos
│       ├── notification.ts         # Création de notifications internes
│       ├── map.ts                  # Utilitaires géospatiaux (distance, rayon…)
│       ├── imageGeneration.ts      # Génération d'images IA (si utilisée)
│       ├── voiceTranscription.ts   # Transcription vocale (si utilisée)
│       └── llm.ts                  # Appels LLM côté serveur
│
├── client/
│   ├── public/
│   └── src/
│       ├── App.tsx                 # ⭐ Déclaration des routes (Wouter)
│       ├── main.tsx                 # ⭐ Bootstrap React + client tRPC (httpBatchLink + superjson) + QueryClient
│       ├── index.css                # Design tokens Tailwind v4 (couleurs Memphis : peach/mint/lilac/accent) + animations
│       ├── const.ts                 # getLoginUrl() — génère l'URL OAuth/login au runtime
│       │
│       ├── pages/                   # ⭐ Une page = une route (voir docs/PAGES.md pour le détail des actions)
│       │   ├── Home.tsx                  # Landing page publique (avant connexion)
│       │   ├── LoginPage.tsx / SignupPage.tsx
│       │   ├── DiscoveryPage.tsx         # Swipe (cœur de l'app)
│       │   ├── MatchesPage.tsx
│       │   ├── ConversationPage.tsx      # Messagerie d'un match
│       │   ├── FavoritesPage.tsx
│       │   ├── SwipeHistoryPage.tsx
│       │   ├── ProfilePage.tsx
│       │   ├── PublicProfilePage.tsx
│       │   ├── DogsPage.tsx
│       │   ├── EventsPage.tsx
│       │   ├── LostDogsPage.tsx
│       │   ├── WalkingMapPage.tsx
│       │   ├── VerificationPage.tsx
│       │   ├── ReviewPage.tsx
│       │   ├── ComponentShowcase.tsx     # Démo interne des composants UI
│       │   └── NotFound.tsx
│       │
│       ├── components/               # Composants métier (12 custom)
│       │   ├── AppNav.tsx                 # Navigation principale (bottom nav mobile)
│       │   ├── DashboardLayout.tsx        # Layout des pages authentifiées
│       │   ├── Map.tsx                    # Carte MapLibre GL
│       │   ├── CompatibilityScore.tsx     # Affichage du score de compatibilité
│       │   ├── DogAvatarFallback.tsx
│       │   ├── GeolocationStatus.tsx
│       │   ├── WalkingMapFilters.tsx
│       │   ├── MemphisBackground.tsx      # Fond décoratif Memphis (formes SVG chien-thématiques)
│       │   ├── AIChatBox.tsx
│       │   ├── ManusDialog.tsx
│       │   ├── ErrorBoundary.tsx
│       │   └── ui/                        # 53 composants shadcn/ui (Radix + Tailwind)
│       │
│       ├── hooks/
│       │   ├── useRealTimeGeolocation.ts   # Suivi position en temps réel (RGPD-friendly)
│       │   ├── useWalkingTracking.ts       # Suivi de balade
│       │   ├── useMobile.tsx
│       │   ├── useComposition.ts
│       │   └── usePersistFn.ts
│       │
│       ├── _core/hooks/useAuth.ts          # ⭐ Hook d'authentification (isAuthenticated, user)
│       │
│       └── lib/
│           ├── trpc.ts                     # Instance createTRPCReact<AppRouter>()
│           ├── sounds.ts                   # SoundEngine (Web Audio API) — sons de swipe/match
│           ├── dogMarkerUtils.ts           # Utilitaires marqueurs carte
│           └── utils.ts
│
├── logs/                          # Logs applicatifs (auth.log, swipe.log, match.log, message.log)
├── patches/                       # Patches de dépendances
└── references/                    # Guides de plateforme (mobile/Capacitor, cron jobs) — pas spécifiques à Doggle
```

`⭐` = fichier à connaître en priorité pour comprendre/modifier le comportement de l'app.

---

## 🗄️ Modèle de données

### Tables Drizzle ORM (`drizzle/schema.ts` — source de vérité)

| Table | Rôle |
|---|---|
| `users` | Compte + profil maître (âge, bio, intérêts, habitudes de balade, ce qu'il recherche, localisation, photo) |
| `dogs` | Profil chien (nom, race, âge, description, personnalité, jusqu'à 3 photos) |
| `swipes` | Un like/pass d'un utilisateur vers un autre |
| `matches` | Match mutuel entre deux utilisateurs + score de compatibilité |
| `messages` | Messages échangés dans un match |
| `notifications` | Notifications internes (nouveau match, nouveau message…) |
| `reviews` | Avis/notes laissés entre utilisateurs |
| `verifications` | Statut de vérification d'identité (photo selfie) |

### Tables gérées en SQL brut (absentes de `drizzle/schema.ts`, voir `server/db.ts`)

⚠️ **Piège connu** : ces fonctionnalités ne passent PAS par Drizzle — toute évolution de leur schéma doit être faite directement en SQL, pas via `drizzle-kit generate`.

| Domaine | Fonctions dans `server/db.ts` |
|---|---|
| Favoris | `addFavorite`, `removeFavorite`, `isFavorite`, `getFavorites` |
| Événements | `createEvent`, `getNearbyEvents`, `joinEvent` |
| Chiens perdus | `reportLostDog`, `getNearbyLostDogs` |
| Signalements | `reportSighting`, `getSightings` |
| Parrainage | `createSponsorshipRequest` |

Le parrainage (`sponsorship.*`), les services de promenade (`walkingService.*`) et certaines routes `events`/`lostDogs` (ex: `rateEvent`, `markAsFound`, `getMyEvents`, `getAvailableSponsors`) sont actuellement des **stubs côté serveur** (retournent une réponse statique `{ success: true }` ou `[]` sans persister en base) — voir [BUSINESS_RULES.md](./BUSINESS_RULES.md#stubs-non-implémentés) pour la liste exacte.

---

## 🔌 Comment le client parle au serveur

- **tRPC** avec `httpBatchLink` + transformer **superjson** (`client/src/main.tsx`).
- Toutes les requêtes passent par `/api/trpc/*`. Les 429 (rate limit) sont gérés **dans tRPC lui-même** (middleware `server/_core/trpc.ts`), jamais en JSON brut Express, pour rester compatibles avec le parsing batch/superjson du client (voir [CHANGELOG.md](../CHANGELOG.md) pour l'historique du bug corrigé).
- Sessions : cookie `HttpOnly`, `SameSite: Lax`, avec repli **Bearer token via `sessionStorage`** pour les contextes où les cookies tiers sont bloqués (Safari ITP, WebView).

## 🔒 Sécurité en un coup d'œil

- Rate limiting : 5 req/min sur `auth.login`/`auth.signup`, 200 req/15 min globalement — implémenté en middleware tRPC (par IP).
- Headers : Helmet-like manuel (CSP, HSTS, X-Frame-Options, nosniff), CORS strict sur liste blanche d'origines.
- `app.set("trust proxy", true)` obligatoire derrière Nginx.
- Vérification d'identité par selfie (`verification.*`), validée par un admin (`role === "admin"`).
