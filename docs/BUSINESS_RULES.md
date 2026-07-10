# 📐 Doggle — Règles Métier

> Ce document décrit **ce que fait le code**, domaine par domaine : algorithmes, seuils, contraintes de validation, et ce qui est réellement implémenté vs simulé (stub). Pour l'arborescence, voir [ARCHITECTURE.md](./ARCHITECTURE.md). Pour les actions disponibles par page, voir [PAGES.md](./PAGES.md).
>
> Source de vérité : `server/routers.ts`, `server/db.ts`, `shared/compatibilityEngine.ts`. Toute règle ci-dessous est testée dans `server/*.test.ts`.

---

## 1. Authentification & Comptes

- **Inscription** (`auth.signup`) : email valide, mot de passe ≥ 6 caractères, nom ≥ 2 caractères. Mot de passe haché avec bcrypt (10 rounds). Session créée immédiatement après inscription (cookie 1 an).
- **Connexion** (`auth.login`) : email + mot de passe. Message d'erreur volontairement générique ("Invalid email or password") pour ne pas révéler si l'email existe.
- **Déconnexion** (`auth.logout`) : efface le cookie de session.
- **Rate limiting dédié** : 5 tentatives de login/signup par minute et par IP. Au-delà, `TRPCError({ code: "TOO_MANY_REQUESTS" })` — géré en middleware tRPC pour rester compatible avec le client (voir [CHANGELOG.md](../CHANGELOG.md)).
- **Rate limiting global** : 200 requêtes/15 min par IP sur l'ensemble de l'API tRPC.
- Comptes de test : voir CLAUDE.md (`admin@doggle.com` / `doggle2026` sur préprod, rôle admin).

## 2. Profil Maître

- Champs modifiables (`user.updateProfile`) : âge (1-150), centres d'intérêt (liste libre), habitudes de balade (texte libre), "ce que je recherche" (`friend` | `mentor` | `intergenerational`, multi-choix), bio (≤ 500 caractères), photo de profil (doit être une URL valide), numéro de téléphone.
- Chaque mise à jour de profil déclenche un **webhook n8n** (`profile.updated`) — utilisé pour les notifications WhatsApp externes.
- **Localisation** : `user.updateLocation` (position courante, utilisée pour la découverte), `user.setHomeLocation` (domicile, utilisé pour la "Zone de Protection Confidentielle" sur la carte des maîtres en balade), `user.toggleLocationSharing` (opt-in/opt-out RGPD du partage de position en temps réel).
- Latitude ∈ [-90, 90], longitude ∈ [-180, 180] — validé côté serveur (zod), pas seulement côté client.

## 3. Profil Chien

- Un chien a : nom (obligatoire, 1-100 caractères), race, âge (0-50), description (≤ 500), personnalité (liste de traits), **jusqu'à 3 photos maximum** (`photoUrls`, chaque URL doit être valide).
- Un utilisateur peut avoir plusieurs chiens (`dog.getMyDogs`).
- Toute action sur un chien (`getDog`, `updateDog`, `deleteDog`) vérifie que **le chien appartient bien à l'utilisateur courant** (`dog.userId !== ctx.user.id` → `NOT_FOUND`, pas de fuite d'info sur l'existence du chien).
- ⚠️ `deleteDog` a une vérification de propriété fonctionnelle mais la suppression elle-même est un **TODO non implémenté** dans `server/routers.ts` (`// TODO: Implement delete logic`) — l'appel renvoie `success: true` sans rien supprimer en base.

## 4. Découverte & Swipe (cœur de l'app)

- **Geste** : glisser la carte à droite = *like*, à gauche = *pass* — implémenté avec Framer Motion (`drag="x"`), seuil de déclenchement : **offset > 100px OU vélocité > 500px/s** dans la direction concernée (`client/src/pages/DiscoveryPage.tsx`). Boutons ❤️/✖️ disponibles en alternative au geste.
- **Anti-doublon** : un utilisateur ne peut swiper qu'une fois sur un même profil (`BAD_REQUEST: "Already swiped on this user"`).
- **Auto-like de retour** (dev/préprod uniquement, ou pour les profils "seed") : si la cible est un profil de démo (email `@example.com` ou ID ≥ 100) OU si on n'est pas en production, le swipe déclenche automatiquement un like retour pour simuler un match — **ce comportement ne doit jamais s'activer en production réelle** (`process.env.NODE_ENV !== "production"` est une des deux conditions, l'autre étant `ctx.user.role === "admin"`).
- **Compteur quotidien** : `discovery.getDailySwipeCount` — bornes UTC (minuit à minuit), pas de limite dure actuellement, juste un compteur affiché à l'utilisateur.
- **Rayon de recherche** : 0.5 à 50 km, configurable (slider), défaut 5 km.
- **Repli sur données de démo** : si `db.getNearbyDuos` renvoie 0 résultat (base vide ou hors-ligne), l'API sert des duos fictifs pré-calculés pour ne jamais montrer une découverte vide en démo.

### Calcul du score de compatibilité (`shared/compatibilityEngine.ts`)

Score global = **60% compatibilité chiens + 40% compatibilité maîtres** (les chiens sont prioritaires, cœur du concept).

**Compatibilité chiens** = personnalité (50%) + âge (30%) + race (20%).
**Compatibilité maîtres** = intérêts communs (40%) + habitudes de balade (35%) + objectifs recherchés (25%).

Règle des objectifs ("ce que je recherche") :
- Objectif commun (ex: les deux cherchent un ami) → **score 90**
- Objectifs complémentaires (ex: mentor ↔ friend, intergenerational ↔ friend, intergenerational ↔ mentor) → **score 75**
- Objectifs différents non complémentaires → **score 40**
- Information manquante → **score neutre 50**

Affichage : "Excellent match 🔥" (≥85), "Bon match 👍" (≥70), "Compatible 💙" (≥50), "Peut-être 🤔" (≥30), "Peu compatible 😕" (<30).
Si les infos de compatibilité manquent au moment du match (pas de chien renseigné), un **score par défaut de 50.0** est utilisé — jamais d'erreur bloquante.

## 5. Matchs & Réparation Automatique

- Un match est créé quand les deux swipes mutuels sont "like".
- **`healStuckMatches()`** (`server/db.ts`, appelé au démarrage du serveur) répare les swipes mutuels qui n'ont pas généré de match (bug historique). **Ne jamais supprimer cette fonction** (voir CLAUDE.md).
- Notification créée pour les deux utilisateurs à la création d'un match + webhook n8n `match.created`.

## 6. Messagerie

- Longueur d'un message : 1 à 1000 caractères.
- Chaque message envoyé crée une notification pour le destinataire + déclenche le webhook n8n `message.received`.
- ⚠️ **Faille connue, non corrigée** : `message.sendMessage` ne vérifie pas que l'expéditeur fait partie du match ciblé (`// TODO: Verify user is part of this match` dans `routers.ts`). N'importe quel utilisateur connecté peut actuellement écrire dans une conversation en devinant un `matchId`. À corriger avant une mise en production à plus grande échelle.

## 7. Favoris & Historique

- On ne peut pas se mettre soi-même en favori (`BAD_REQUEST: "Cannot favorite yourself"`).
- L'historique de swipe (`history.getSwipeHistory`) est limité à un maximum de **100 résultats par requête** (défaut 50).

## 8. Chiens Perdus & Signalements

- Signalement de perte : description (≤ 500), date, lieu, coordonnées GPS, récompense optionnelle, téléphone de contact optionnel.
- Signalement d'observation ("sighting") : niveau de confiance obligatoire parmi `certain` | `likely` | `possible`.
- Rayon de recherche par défaut pour les chiens perdus à proximité : **25 km** (plus large que la découverte classique, cohérent avec l'urgence).
- ⚠️ `markAsFound` est un **stub** : renvoie `success: true` sans mettre à jour le statut en base.

## 9. Événements

- Titre (5-255 caractères), description (10-1000), durée minimum **15 minutes**.
- ⚠️ `getMyEvents` et `rateEvent` sont des **stubs** (retournent respectivement `[]` et `success: true` sans logique réelle).

## 10. Avis & Notation

- Note obligatoire de 1 à 5, commentaire optionnel (≤ 500 caractères).
- Consultation des avis (`getReviewsForUser`) et de la moyenne (`getAverageRating`) sont des routes **publiques** (pas besoin d'être connecté) — utilisées sur les profils publics.

## 11. Vérification d'Identité

- L'utilisateur soumet une photo (selfie) → statut `pending`.
- **Seul un administrateur** (`ctx.user.role === "admin"`) peut approuver (`approveVerification`) ou rejeter (`rejectVerification`, avec motif obligatoire) — sinon `FORBIDDEN`.
- Chaque décision déclenche le webhook n8n `verification.updated`.

## 12. Parrainage & Services de Promenade

⚠️ **Domaines entièrement simulés côté serveur** — aucune persistance réelle actuellement :
- `sponsorship.*` : `requestSponsorship` valide les entrées (motif ≥ 10 caractères, fréquence `weekly|biweekly|monthly`) mais ne sauvegarde rien ; `getAvailableSponsors`/`getMySponsors` renvoient toujours `[]` ; `acceptSponsorship`/`rateSponsorship` renvoient toujours `success: true`.
- `walkingService.*` : même chose — `createService`/`bookService`/`rateService` valident les entrées mais ne persistent rien ; `getNearbyServices`/`getMyBookings` renvoient toujours `[]`.

Ces deux domaines sont prêts côté validation/contrat d'API mais **nécessitent l'implémentation de la persistance en base** avant d'être utilisables en production.

## 13. Sécurité & Fiabilité (transverse)

- **Comparaison d'IDs** : toujours `Number(x) === Number(y)` — mysql2 peut renvoyer des `BigInt`/`string` pour les colonnes numériques.
- **Colonnes SQL dupliquées** interdites dans un même `SELECT` (un alias + le nom brut → le brut écrase l'alias).
- Toute route protégée (`protectedProcedure`) rejette un appelant non authentifié avec `UNAUTHORIZED` — testé systématiquement (`server/authz.test.ts`).
- Toute route admin (`adminProcedure` / vérification manuelle du rôle) rejette un non-admin avec `FORBIDDEN`.

---

## Stubs non implémentés (résumé)

| Route | Comportement actuel |
|---|---|
| `dog.deleteDog` | Vérifie la propriété mais ne supprime rien |
| `lostDogs.markAsFound` | Renvoie succès sans mise à jour DB |
| `events.getMyEvents` | Renvoie toujours `[]` |
| `events.rateEvent` | Renvoie toujours succès, aucune persistance |
| `sponsorship.*` (tout le domaine) | Validation uniquement, aucune persistance |
| `walkingService.*` (tout le domaine) | Validation uniquement, aucune persistance |

Ces éléments sont volontairement listés ici pour que toute IA ou développeur sache immédiatement, sans devoir lire le code, ce qui est du "vrai" produit fonctionnel et ce qui est encore une maquette d'API.
