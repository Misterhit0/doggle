# 📱 Doggle — Pages, Routes & Actions Possibles

> Inventaire de chaque page de l'application : route, but, et **toutes les actions que l'utilisateur peut y faire**. Pour l'architecture technique, voir [ARCHITECTURE.md](./ARCHITECTURE.md). Pour les règles métier détaillées derrière chaque action, voir [BUSINESS_RULES.md](./BUSINESS_RULES.md).
>
> Routes déclarées dans `client/src/App.tsx` (Wouter). Navigation principale (bottom nav mobile + nav desktop) dans `client/src/components/AppNav.tsx` : **Découvrir → Balades → Matchs → Profil** (accès rapide), plus un menu étendu vers Mes chiens, Événements, Chiens perdus, Favoris, Historique.

---

## `/` — Accueil (landing page publique)
**Fichier** : `Home.tsx` — page marketing avant connexion, redessinée (photographie réelle, animations).

Actions possibles :
- Cliquer **"Se connecter"** (nav) → redirige vers login/OAuth.
- Cliquer **"Rejoindre Doggle"** (hero + CTA finale) → redirige vers login/OAuth (inscription).
- Cliquer **"Voir les chiens perdus"** → va sur `/chiens-perdus` (section urgence).
- Défiler la page (sections : Comment ça marche, Notre mission, Chiens perdus, CTA finale, Footer).
- Si déjà connecté : la nav affiche "Bienvenue, {nom}" + bouton "Tableau de bord".

## `/login` — Connexion
**Fichier** : `LoginPage.tsx`
- Saisir email + mot de passe → `auth.login`.
- En cas d'échec : message générique "Invalid email or password" (pas de fuite d'info).
- Rate-limit : 5 tentatives/minute/IP au-delà de quoi un message "trop de tentatives" apparaît (429 → `TOO_MANY_REQUESTS`).
- Lien vers `/signup` si pas encore de compte.

## `/signup` — Inscription
**Fichier** : `SignupPage.tsx`
- Saisir nom (≥2 car.), email valide, mot de passe (≥6 car.) + confirmation → `auth.signup`.
- Session créée automatiquement après inscription réussie (redirection vers l'app).

---

## `/discovery` — Découverte (cœur de l'app)
**Fichier** : `DiscoveryPage.tsx`

Actions possibles :
- **Swiper la carte au doigt/souris** : glisser à **droite = J'aime**, à **gauche = Passer** (seuil : 100px de déplacement ou 500px/s de vélocité). Overlay visuel "J'AIME" (vert) / "NOPE" (rouge) qui apparaît progressivement pendant le glissement, rotation de la carte, son de swipe.
- **Boutons alternatifs** : ❤️ (like), ✖️ (pass), ⭐ (ajouter aux favoris sans swiper) — mêmes règles métier que le swipe au doigt.
- Ajuster le **rayon de recherche** (slider, 0.5-50 km, défaut 5 km).
- Activer/désactiver l'**auto-refresh** de la liste de duos.
- Voir le **compteur de swipes du jour**.
- Voir la carte suivante en arrière-plan (pile de cartes façon Tinder).
- Si "Fin de la découverte" (plus de duos dans le rayon) : bouton **"Réessayer"**.
- Un like mutuel déclenche un **toast de match** ("🎉 Nouveau match !") invitant à aller discuter.

## `/matches` — Mes Matchs
**Fichier** : `MatchesPage.tsx`
- Liste des matchs mutuels (`match.getMatches`).
- Cliquer un match → ouvre la conversation associée.
- État vide : "Aucun match pour le moment".

## `/conversation/:matchId` — Conversation
**Fichier** : `ConversationPage.tsx`
- Voir l'historique des messages du match (`message.getMessages`).
- Écrire et envoyer un message (`message.sendMessage`, 1 à 1000 caractères) → `sendMessageMutation`.
- État vide : "Soyez le premier à écrire !".
- Cas d'erreur : "Match non trouvé".

## `/favorites` — Mes Favoris
**Fichier** : `FavoritesPage.tsx`
- Liste des profils mis en favori (`favorite.getFavorites`), avec leurs chiens.
- **Retirer un favori** (`favorite.removeFavorite`).
- État non connecté : "Veuillez vous connecter". État vide : "Aucun profil favori pour le moment".

## `/history` — Historique des Swipes
**Fichier** : `SwipeHistoryPage.tsx`
- Liste des profils déjà likés / passés (`history.getSwipeHistory`, max 100 résultats), avec chiens associés.
- **Ajouter aux favoris** directement depuis l'historique (`favorite.addFavorite`).
- Rafraîchissement automatique à chaque navigation vers la page (`refetchOnMount: 'always'` — corrige un bug historique de cache obsolète).

---

## `/profile` — Mon Profil
**Fichier** : `ProfilePage.tsx`
- Modifier : bio, âge, numéro de téléphone (WhatsApp), photo de profil (URL), centres d'intérêt, habitudes de balade, sociabilité, "ce que je recherche" (ami / mentor / échange intergénérationnel) → `user.updateProfile`.
- Voir la liste de **mes chiens** avec accès rapide **"Ajouter un chien"** (renvoie vers `/dogs`).
- État vide chiens : "Aucun chien ajouté".

## `/profile/:userId` — Profil Public (d'un autre utilisateur)
**Fichier** : `PublicProfilePage.tsx`
- Consultation du profil et des chiens d'un autre utilisateur (`user.getPublicProfile`) — accessible uniquement en étant soi-même connecté (`protectedProcedure`).

## `/dogs` — Mes Chiens
**Fichier** : `DogsPage.tsx`
- Créer un chien : nom (obligatoire), race, âge, description, personnalité, photos (max 3) → `dog.createDog`.
- Modifier un chien existant → `dog.updateDog`.
- Liste des chiens (`dog.getMyDogs`). État vide : "Aucun chien pour le moment".
- (Suppression de chien : bouton présent côté UI mais **non fonctionnel côté serveur**, voir BUSINESS_RULES.md.)

## `/verification` — Vérification d'Identité
**Fichier** : `VerificationPage.tsx`
- **Glisser-déposer un selfie** ou **sélectionner un fichier** → `verification.submitVerification`.
- Voir le statut courant : "En attente de revue", "Vérifié ✓", "Vérification refusée" (avec motif) → `verification.getVerification`.
- Consultation des "Critères de validation" et aperçu de la photo avant envoi.
- (Approbation/rejet réservés aux admins, pas depuis cette page — voir back-office/admin.)

## `/review/:userId` — Laisser un Avis
**Fichier** : `ReviewPage.tsx`
- Donner une note (1 à 5) et un commentaire optionnel (≤500 caractères) sur un autre utilisateur → `reviews.createReview`.

---

## `/events` — Événements
**Fichier** : `EventsPage.tsx`
- **Créer un événement** : titre (5-255), description (10-1000), type, lieu, coordonnées, date, durée (≥15 min) → `events.createEvent`.
- Voir les événements à proximité sur une **carte** (`events.getNearbyEvents`), avec filtre par type.
- **Rejoindre un événement** (`events.joinEvent`).
- État vide : "Aucun événement trouvé près de vous".

## `/lost-dogs` — Chiens Perdus
**Fichier** : `LostDogsPage.tsx`
- **Signaler un chien perdu** : sélectionner un de ses chiens, description, date, lieu + coordonnées, récompense optionnelle, téléphone de contact → `lostDogs.reportLostDog`.
- **Signaler une observation** d'un chien perdu (lieu, date, description, niveau de confiance certain/likely/possible) → `lostDogs.reportSighting`.
- Voir les chiens perdus à proximité sur une carte (rayon par défaut 25 km) → `lostDogs.getNearbyLostDogs`.
- Voir les signalements liés à un chien perdu → `lostDogs.getSightings`.
- Bandeau "URGENT" mis en avant visuellement.

## `/walking-map` — Carte des Maîtres en Balade
**Fichier** : `WalkingMapPage.tsx`
- Voir les **maîtres actifs à proximité** en temps réel (`discovery.getActiveWalkers`), soi-même exclu des résultats.
- Voir sa **position actuelle** et sa **distance au domicile**.
- **Zone de Protection Confidentielle** : le domicile exact n'est jamais affiché aux autres, seule une zone approximative — pensé RGPD.
- Statut de suivi (activé/désactivé) piloté par `user.toggleLocationSharing`.

---

## `/component-showcase` — Vitrine de composants
**Fichier** : `ComponentShowcase.tsx` — page de démo interne des composants UI (pas destinée aux utilisateurs finaux).

## `/404` et route par défaut — Page introuvable
**Fichier** : `NotFound.tsx`

---

## Actions transverses (disponibles sur toutes les pages authentifiées)

- **Navigation principale** (`AppNav.tsx`) : Découvrir, Balades, Matchs, Profil en accès direct (bottom nav mobile) + menu étendu (Mes chiens, Événements, Chiens perdus, Favoris, Historique).
- **Déconnexion** (`auth.logout`) — accessible depuis le menu profil.
- **Notifications** internes (nouveau match, nouveau message) — `notification.getNotifications`, badge sur l'icône Matchs.
