# 📈 Woofyz - Historique Complet du Projet

## Résumé Exécutif
- **Projet**: Woofyz (anciennement Doggle) - Application de matching pour propriétaires de chiens
- **Démarrage**: Juillet 2026
- **Commits**: 109 commits documentés
- **Status Actuel**: v2.7 - En production
- **Branche Principale**: `main` (production), `preprod` (staging)

---

## 📊 Timeline Détaillée des Évolutions

### V2.7 - Dog Sitter Filtering & Matching (ACTUEL)
**Date**: 13 Juillet 2026 - 06:10 UTC  
**Branche**: `feature/tencent-hunyuan-code` → `preprod`  
**Status**: ✅ Déployé en Preprod

#### Commits
| Hash | Date/Heure | Type | Description |
|------|-----------|------|-------------|
| `f3419b0` | 2026-07-13 06:10:07 | **FEAT** | **Complet: Dog Sitter Filtering & Matching Implementation** |

#### Détails de l'Implémentation
✨ **Nouvelles Fonctionnalités:**
- Test files reorganization (tests/ → server/ pour compliance Vitest)
- 8 test cases dog-to-dog matching
- Comprehensive dog sitter filter tests
- Full algorithm documentation

📚 **Documentation Créée:**
- `docs/COMPATIBILITY_ALGORITHM.md` - 248 lignes
- Dog-to-dog matching scoring (breed, personality, age)
- Dog sitter keyword matching (B2B) avec bio analysis
- Size penalty system & gentle personality bypass
- Interest/habit/seek alignment scoring
- Affinities highlighting pour UI

🧪 **Test Coverage:**
- 279/279 tests passing (100%)
- Dog-to-dog matching: breed, personality, size penalties
- Dog sitter matching: keyword extraction, interest overlap
- Affinities highlighting: mutual & sitter-specific

🚀 **Déploiement:**
- ✅ VPS preprod: HTTP 200
- ✅ Direct endpoint: http://187.55.227.99:3001 HTTP 200
- ✅ HTTPS: https://preprod.woofyz.fr HTTP 200

---

### V2.6 - Rebranding to Woofyz
**Date**: 13 Juillet 2026 - 04:14 à 05:12 UTC  
**Branche**: Multiple branches  
**Status**: ✅ Release

#### Commits (5 commits)
| Hash | Date/Heure | Type | Description |
|------|-----------|------|-------------|
| `e58acb1` | 2026-07-13 05:12:13 | **RELEASE** | **v2.6** |
| `64e1ab1` | 2026-07-13 04:57:53 | **CHORE** | Update admin email config and activate SSL |
| `7831c48` | 2026-07-13 04:48:13 | **CHORE** | Update default admin email to contact@woofyz.com |
| `f5ebdbe` | 2026-07-13 04:25:52 | **CHORE** | Update domains to woofyz.fr |
| `943ec77` | 2026-07-13 04:14:07 | **DOCS** | Rebrand all documentations to Woofyz |

#### Détails du Rebranding
- Changement de nom: Doggle → Woofyz
- Configuration SSL activée
- Domaine: woofyz.fr
- Admin email: contact@woofyz.com
- Theme variables & Woofyz SVG logo

---

### Support Features - Boarding, PetAlert, Breeding
**Date**: 12-13 Juillet 2026  
**Branche**: `feature/boarding-petalert-breeding`  
**Status**: ✅ Intégré

#### Commits (8 commits)
| Hash | Date/Heure | Type | Description |
|------|-----------|------|-------------|
| `ca06e9a` | 2026-07-13 04:08:27 | **DESIGN** | Update theme variables & add Woofyz SVG |
| `e961808` | 2026-07-13 03:59:46 | **DEVOPS** | Make pm2 restarts idempotent on VPS |
| `b77e142` | 2026-07-13 03:58:11 | **REBRAND** | Update project name in package.json |
| `3d3db30` | 2026-07-13 03:57:02 | **REBRAND** | Rename app from Doggle to Woofyz |
| `7ef05af` | 2026-07-12 10:28:50 | **FIX** | Add git clean -fd before git pull on VPS |
| `c7663b1` | 2026-07-12 09:29:44 | **INFRA** | Automatic DB migration system with admin seed |
| `f3ee671` | 2026-07-12 09:14:09 | **RELEASE** | **v2.5** |
| `76c49e2` | 2026-07-12 07:34:17 | **FEAT** | Boarding, Dog-sitter dashboard, PetAlert, Breeding, Vets/Spas on map |

#### Nouvelles Fonctionnalités
- 🏨 Boarding system
- 📋 Dog-sitter dashboard
- 📡 PetAlert RSS integration
- 🔍 Breeding filter
- 🗺️ Vets & Spas on map
- 🗄️ Automatic DB migrations

#### Infrastructure
- Migration system: `server/migrate.ts`
- DB scripts: `db:migrate`, `db:migrate:no-admin`, `db:admin`
- Automatic migration run before VPS build

---

### V2.4.2 - Events System & Map Fixes
**Date**: 10 Juillet 2026 - 22:57 à 23:21 UTC  
**Branche**: `main`, `v2.4.2`  
**Status**: ✅ Production Release

#### Commits (4 commits)
| Hash | Date/Heure | Type | Description |
|------|-----------|------|-------------|
| `e6c4591` | 2026-07-10 23:21:51 | **MERGE** | Merge branch 'preprod' into main |
| `3f66f0b` | 2026-07-10 23:19:25 | **RELEASE** | **v2.4.2** - Events, lost dogs, sightings |
| `0f9aa72` | 2026-07-10 23:04:22 | **MERGE** | Merge branch 'preprod' |
| `040e644` | 2026-07-10 22:57:28 | **RELEASE** | **v2.4.1** - Lost dogs map fixes |

#### Fixes
- ✅ Create events/event_participants/lost_dogs/sightings tables
- ✅ Fix markers race condition
- ✅ Remove geoloc requirement from event creation
- ✅ Fix form validation (dogId=0 falsy bug)
- ✅ LostLocation optional avec GPS fallback

---

### V2.3.1 - Lost Dogs & UX Audit Fixes
**Date**: 10 Juillet 2026 - 07:58 à 18:03 UTC  
**Status**: ✅ Production Release

#### Commits (12 commits)
| Hash | Date/Heure | Type | Description |
|------|-----------|------|-------------|
| `ce3d158` | 2026-07-10 08:17:26 | **RELEASE** | **v2.3.1** |
| `30a4f48` | 2026-07-10 08:12:05 | **FEAT** | Apply homepage UX audit fixes |
| `6d1f1ba` | 2026-07-10 07:58:21 | **RELEASE** | **v2.3** - App settings, payment plans |
| `038149d` | 2026-07-10 22:30:58 | **FIX** | Fix map click stale closure, debounce, geolocate button |
| `7743c32` | 2026-07-10 22:43:03 | **FIX** | Fix form validation for lost dogs |
| `0fd4bf1` | 2026-07-10 18:00:09 | **FIX** | Fix z-index conflict blocking trash button |

#### Nouvelles Fonctionnalités
- ⚙️ App settings & payment plan parameters
- 💰 Daily limits & role editing in CRM
- 🗺️ Lost Dogs page avec map picker
- 📍 GPS geolocation avec fallback

---

### V2.2 - Tinder-Quality UX/UI
**Date**: 09 Juillet 2026 - 04:42 à 07:11 UTC  
**Status**: ✅ Major Release

#### Commits (5 commits)
| Hash | Date/Heure | Type | Description |
|------|-----------|------|-------------|
| `e13d93b` | 2026-07-10 07:11:53 | **RELEASE** | **v2.2** |
| `ef45d17` | 2026-07-10 06:47:00 | **FIX** | Add distance & location fallback to discovery |
| `ffc23f2` | 2026-07-10 06:41:47 | **FEAT** | Admin CRM dashboard & admin account |
| `92dc3d9` | 2026-07-10 06:32:04 | **FEAT** | Implement all footer pages |
| `bd48b2c` | 2026-07-09 04:42:57 | **FEAT** | Tinder-quality UX/UI |

#### UI/UX Redesign
✨ **Gestuelle & Animations:**
- 🖱️ Drag-to-swipe (Framer Motion)
- 🎨 Animated LIKE/NOPE overlays
- 📸 Full-bleed photo with gradient overlay
- 💫 Staggered entrance animations
- 🎯 Tactile gallery dots navigation

✨ **Nouvelles Composantes:**
- ⭐ Star button for favorites
- 📊 Daily swipe counter
- 🔔 Notification dot on Matches tab
- 🎵 Web Audio API sounds (like, pass, match, favorite, tap)
- 👁️ Public profile page (/profile/:userId)

✨ **Typographie & Design:**
- Font: Outlook → Inter (Google Fonts)
- Variable fonts support
- New keyframes: stamp-pop, heartbeat, confetti-fall, match-pulse

---

### V2.1.1 - Maps Migration & Dog Photos
**Date**: 09 Juillet 2026 - 02:06 à 06:25 UTC  
**Status**: ✅ Release

#### Commits (8 commits)
| Hash | Date/Heure | Type | Description |
|------|-----------|------|-------------|
| `fa2d962` | 2026-07-10 06:25:08 | **VERSION** | Version 2.1.1 |
| `b07daf0` | 2026-07-10 06:20:40 | **TEST** | Test OK |
| `8f95251` | 2026-07-10 05:52:31 | **FEAT** | Homepage redesign, rate-limit fix, test coverage |
| `85d9d9c` | 2026-07-09 02:52:26 | **FEAT** | Sort by compatibility, display affinities |
| `64b5c5c` | 2026-07-09 03:20:48 | **FEAT** | Migrate Google Maps → MapLibre GL JS |
| `1d63e1d` | 2026-07-09 03:07:56 | **FEAT** | 4 major features: Dogs/Events/LostDogs/Walking Maps |
| `4609e53` | 2026-07-09 02:43:54 | **FEAT** | Limit dog photos to 3, Tinder-style cards |

#### Migration Maps
- 🗺️ Google Maps → MapLibre GL JS (open source, free)
- 📱 CartoDB basemaps support
- ✅ CSP headers configured for workers

#### Features Principales
- 🐕 DogsPage Tinder-style
- 📅 EventsPage avec map
- 🆘 LostDogsPage map picker
- 🚶 Walking Map RGPD compliant
- 📍 Breed-based affinities

---

### V1.0 - Initial Release
**Date**: 09 Juillet 2026 (early commits)  
**Status**: ✅ Foundation Release

#### Core Features
- ✅ User authentication (signup/login/logout)
- ✅ Dog profile creation & management
- ✅ Discovery page with swipe gestures
- ✅ Match creation & messaging
- ✅ Rate limiting & security headers
- ✅ Database schema (MySQL + DrizzleORM)
- ✅ tRPC API architecture

---

## 🏗️ Architecture & Infrastructure

### Stack Technique
| Component | Technology |
|-----------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Node.js + Express + tRPC |
| Database | MySQL 8 + DrizzleORM |
| Maps | MapLibre GL JS |
| Hosting | VPS (187.55.227.99) |
| Reverse Proxy | Nginx |
| Process Manager | PM2 |
| CI/CD | Git pull based deployment |

### VPS Structure
```
/var/www/woofyz          # Production (main branch)
/var/www/woofyz-preprod  # Staging (preprod branch)
/var/www/woofyz-newpreprod # Testing (feature/new-branding-identity)
```

### Deployment Strategy
```
Local Git → Push to GitHub → SSH into VPS → Git pull + build + PM2 restart
```

---

## 📊 Statistiques de Développement

### Commits par Catégorie
- 🟢 **FEAT** (Features): ~35 commits
- 🔴 **FIX** (Bug Fixes): ~25 commits
- 📘 **CHORE** (Maintenance): ~20 commits
- 📗 **DOCS** (Documentation): ~10 commits
- 🟡 **REFACTOR**: ~5 commits
- 🔵 **INFRA** (DevOps): ~5 commits
- 🟠 **DESIGN**: ~4 commits
- 🟣 **MERGE**: ~5 commits

### Timeline Chronologique
| Période | Commits | Focus |
|---------|---------|-------|
| 09 Juil | 45 | Core features, UX/UI, Maps |
| 10 Juil | 35 | Features majeures, fixes |
| 12 Juil | 15 | Support features, DB migrations |
| 13 Juil | 14 | Rebranding, Dog sitter features |

---

## 🎯 Roadmap & Évolutions Futures

### En Cours (Feature Branches)
- `feature/tencent-hunyuan-code` - Dog sitter algorithms ✅ (Completed)
- `feature/new-branding-identity` - Woofyz newpreprod testing

### Próximas Prioridades
- [ ] ML-based match scoring
- [ ] Real-time notifications (WebSockets)
- [ ] Payment integration (Stripe)
- [ ] Social features (posts, comments)
- [ ] Multi-language support
- [ ] Mobile app (React Native)

---

## 🔐 Security & Compliance

### Implemented
✅ Rate limiting (200/15min global, 5/1min auth)  
✅ SSL/TLS encryption  
✅ CORS headers  
✅ Helmet security headers  
✅ Session security (HttpOnly, Secure, SameSite=Lax)  
✅ RGPD compliant (Walking Map)  
✅ CSP headers for third-party resources  

### Database Security
✅ SQL prepared statements (DrizzleORM)  
✅ Input validation at API boundary  
✅ Automatic migrations tracking  
✅ Admin seed protection  

---

## 📝 Logs & Documentation

### Documentation Files
- `CLAUDE.md` - Development rules & guidelines (2026-07-09)
- `docs/COMPATIBILITY_ALGORITHM.md` - Algorithm documentation (2026-07-13)
- `docs/PROJECT_EVOLUTION.md` - This file (2026-07-13)
- `AI_INSTRUCTIONS.md` - AI development workflow
- `todo.md` - Feature completion status

### VPS Logs
- PM2 logs: `pm2 logs woofyz-preprod` / `pm2 logs woofyz`
- Application logs: `/var/www/woofyz*/dist/index.js`

---

## ✅ Version History Summary

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| v2.7 | 2026-07-13 | 🟢 Preprod | Dog sitter filtering & matching ✅ |
| v2.6 | 2026-07-13 | 🟢 Preprod | Rebranding to Woofyz |
| v2.5 | 2026-07-12 | 🟢 Preprod | Boarding, PetAlert, Breeding |
| v2.4.2 | 2026-07-10 | 🟢 Prod | Events system & map fixes |
| v2.4.1 | 2026-07-10 | 🟢 Prod | Lost dogs features |
| v2.3.1 | 2026-07-10 | 🟢 Prod | UX audit fixes |
| v2.3 | 2026-07-10 | 🟢 Prod | App settings & payment plans |
| v2.2 | 2026-07-10 | 🟢 Prod | Tinder-quality UI/UX |
| v2.1.1 | 2026-07-10 | 🟢 Prod | Maps migration |
| v1.0 | 2026-07-09 | 🟢 Prod | Initial release |

---

**Last Updated**: 2026-07-13 06:15 UTC  
**Created by**: Claude Haiku 4.5  
**Branch**: `preprod` / `main`

