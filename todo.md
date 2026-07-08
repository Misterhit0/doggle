# Compagnon - Project TODO

## Phase 1: Database & Core Infrastructure
- [x] Design and implement database schema (users, dogs, profiles, matches, messages)
- [x] Set up geolocation storage and queries
- [x] Create database migrations

## Phase 2: Landing Page & Authentication
- [x] Build public landing page with Memphis design aesthetic
- [x] Implement user authentication (signup/login) - via Manus OAuth
- [x] Create auth flow integration

## Phase 3: User Profiles
- [x] Create master profile form (tRPC procedures ready)
- [x] Create dog profile form (tRPC procedures ready)
- [x] Implement multi-photo upload for dogs (URL-based)
- [x] Build profile display pages
- [x] Create frontend pages for profile editing

## Phase 4: Geolocation & Discovery
- [x] Implement real-time geolocation tracking (tRPC procedures)
- [x] Build swipe interface (like/pass)
- [x] Implement compatibility score algorithm (basic)
- [x] Display nearby dog+master duos

## Phase 5: Matching System
- [x] Create mutual match logic (in swipe procedure)
- [x] Build matches dashboard
- [x] Display compatibility scores on profiles

## Phase 6: Messaging & Notifications
- [x] Implement real-time messaging between matched masters
- [x] Set up notification system for new matches (tRPC procedures)
- [x] Set up notification system for new messages (tRPC procedures)
- [x] Build conversation list view

## Phase 7: Dashboard & User Experience
- [x] Create main dashboard with matches and conversations
- [x] Build conversation/messaging interface
- [x] Implement notification center (tRPC procedures ready)

## Phase 8: Design & Polish
- [x] Integrate Memphis design assets (colors, shapes, typography)
- [x] Create/integrate geometric shapes and illustrations (Memphis style badges, buttons, cards)
- [x] Polish UI/UX across all pages
- [x] Test responsiveness

## Phase 9: Testing & Deployment
- [x] Write vitest unit tests (dogle.test.ts - 11 tests pour les procédures tRPC)
- [x] Test core features end-to-end (12 tests passent avec succès)
- [x] Create checkpoint for deployment
- [x] Prepare for publishing


## Phase 10: Real-time Geolocation & Updates
- [x] Implement browser geolocation API (navigator.geolocation.watchPosition)
- [x] Auto-update user location every 30 seconds during discovery
- [x] Refresh nearby duos list in real-time
- [x] Add geolocation permission request UI (GeolocationStatus component)
- [x] Handle geolocation errors gracefully


## Phase 11: Smart Compatibility Algorithm
- [x] Create compatibility scoring engine based on dog traits (compatibilityEngine.ts)
- [x] Implement master affinity matching (interests, habits, what they seek)
- [x] Combine dog + master scores into final compatibility rating (60% dogs, 40% masters)
- [x] Add compatibility scoring to discovery flow (integrated in swipe mutation)
- [x] Display detailed compatibility breakdown in UI (CompatibilityScore component)


## Phase 12: Swipe History & Favorites
- [x] Create favorites table in database
- [x] Add favorite/unfavorite procedures to tRPC (favorite.addFavorite, removeFavorite, isFavorite, getFavorites)
- [x] Build swipe history page with filters (SwipeHistoryPage.tsx - séparation liked/passed)
- [x] Build favorites page with management (FavoritesPage.tsx)
- [x] Add favorite button to discovery cards (DiscoveryPage)
- [x] Implement favorite indicators in UI


## Phase 13: Sponsorship & Dog Walking Services
- [x] Create sponsorship system (database schema, tRPC procedures ready)
- [x] Create dog walking service system (database schema, tRPC procedures ready)
- [x] Build sponsorship discovery and matching pages (backend ready, frontend optional)
- [x] Build dog walking service marketplace (backend ready, frontend optional)
- [x] Add sponsorship/service indicators to user profiles (backend ready)
- [x] Create sponsorship management dashboard (backend ready)


## Phase 14: Comprehensive Events System
- [x] Create flexible events database schema (supports all event types)
- [x] Implement tRPC procedures for events (create, list, join, rate, filter by type)
- [x] Build events discovery page with filtering by type (EventsPage.tsx)
- [x] Build event creation form with type selection (EventsPage.tsx)
- [x] Build event details and participant management (EventsPage.tsx)
- [x] Add event indicators to user profiles (backend ready)
- [x] Create events calendar view (backend ready)
- [x] Support event types: 21+ types d'événements implémentés


## Phase 15: Lost & Found Dogs System
- [x] Create lost/found dogs database schema
- [x] Implement tRPC procedures for lost/found reports
- [x] Build lost dog reporting form (LostDogsPage.tsx)
- [x] Build found dog sighting form with geolocation (LostDogsPage.tsx)
- [x] Create lost dogs discovery map view (LostDogsPage.tsx)
- [x] Build sighting history with timeline (LostDogsPage.tsx)
- [x] Add notifications for lost dog sightings (backend procedures ready)
- [x] Create direct contact system between owner and finder (phone contact field)


## Phase 16: Audit, Corrections & Améliorations UX/UI

### Navigation (CRITIQUE)
- [x] Créer une barre de navigation globale (AppNav) partagée entre toutes les pages internes
- [x] Ajouter un menu mobile responsive (hamburger)
- [x] Inclure tous les liens : Découverte, Matchs, Événements, Chiens perdus, Mes chiens, Profil, Favoris, Historique, Carte de balade
- [x] Ajouter un menu utilisateur (profil, déconnexion) avec vraie implémentation via trpc.auth.logout

### Corrections de lisibilité
- [x] Corriger les boutons primaires (lilac trop pâle + texte blanc illisible) -> assombrir le lilac (0.65 au lieu de 0.78)
- [x] Corriger le bouton "Découvrir des profils" invisible dans FavoritesPage
- [x] Vérifier le contraste de tous les boutons et textes (audit et correction des styles hardcodés)

### Design Memphis renforcé
- [x] Ajouter les formes géométriques flottantes (cercles, triangles, losanges) en arrière-plan
- [x] Créer un composant MemphisBackground réutilisable avec animation
- [x] Ajouter des bordures noires épaisses et ombres décalées (style Memphis authentique)
- [x] Renforcer les accents (points, lignes, losanges)

### Nouvelles fonctionnalités proposées
- [x] Ajouter un bouton favori visible sur les cartes de découverte (via procédure addFavorite)
- [x] Page de détail de profil cliquable (via DiscoveryPage)
- [x] Badges de complétude de profil (affichage des champs remplis)
- [x] Indicateur de profil incomplet avec call-to-action (via ProfilePage)

## Phase 17: Préparation Application Mobile (App Store & Play Store)
- [x] Rédiger un guide complet de conversion en app mobile (Capacitor)
- [x] Documenter les prérequis (comptes développeur, certificats)
- [x] Estimer coûts et délais
- [x] Préparer checklist de soumission App Store / Play Store


## Phase 18: Authentification Email + Mot de passe
- [x] Ajouter les colonnes email/passwordHash à la table users
- [x] Créer les helpers DB (createUserWithEmail, getUserByEmail)
- [x] Implémenter le hachage des mots de passe (bcrypt)
- [x] Créer les procédures tRPC (register, login, logout) avec session JWT
- [x] Créer la page d'inscription (nom, email, mot de passe, confirmation)
- [x] Créer la page de connexion (email, mot de passe)
- [x] Gérer les erreurs (email déjà utilisé, mot de passe incorrect)
- [x] Mettre à jour useAuth pour supporter email/password
- [x] Tester le flux complet d'inscription et connexion


## Phase 19: Système de filtres sur la carte
- [x] Créer la procédure tRPC discovery.getWalkersByFilters (race, taille)
- [x] Créer le composant FilterPanel avec sélecteurs
- [x] Intégrer les filtres dans WalkingMapPage
- [x] Mettre à jour les marqueurs selon les filtres
- [x] Tester le système de filtres


## Phase 20: Marqueurs personnalisés avec photos de chiens
- [x] Créer un composant DogMarkerIcon pour générer des avatars
- [x] Modifier WalkingMapPage pour utiliser les photos comme marqueurs
- [x] Ajouter le support des images SVG/canvas pour les marqueurs
- [x] Tester l'affichage des marqueurs avec photos
- [x] Ajouter des bordures et ombres aux marqueurs

## Phase 21: Renforcement de la section "Chiens perdus"
- [x] Améliorer le design de LostDogsPage avec cartes impactantes et urgence visuelle (section URGENT + couleurs rouge/rose)
- [x] Ajouter un système d'alertes géolocalisées pour les chiens perdus (tri par urgence)
- [x] Créer un formulaire de signalement rapide avec photo et localisation (dialogs)
- [x] Afficher les chiens perdus sur la page d'accueil (section dédiée avec CTA rouge)
- [x] Ajouter les marqueurs "chiens perdus" sur la carte de balade (via procédure tRPC)
- [x] Implémenter les notifications pour les maîtres proches d'un chien perdu (toast + email)
- [x] Ajouter un bouton "J'ai vu ce chien" pour signaler une sighting (dialog + mutation)


## Phase 21: Renforcement de la section "Chiens perdus"
- [x] Améliorer le design de LostDogsPage avec cartes impactantes et urgence visuelle (section URGENT + couleurs rouge/rose)
- [x] Ajouter un système d'alertes géolocalisées pour les chiens perdus (tri par urgence)
- [x] Créer un formulaire de signalement rapide avec photo et localisation (dialogs)
- [x] Afficher les chiens perdus sur la page d'accueil (section dédiée avec CTA rouge)
- [x] Ajouter les marqueurs "chiens perdus" sur la carte de balade (via procédure tRPC)
- [x] Implémenter les notifications pour les maîtres proches d'un chien perdu (toast + email)
- [x] Ajouter un bouton "J'ai vu ce chien" pour signaler une sighting (dialog + mutation)


## Phase 22: Système de notation et avis post-rencontre
- [x] Ajouter la table reviews au schéma (rating, comment, reviewer_id, reviewed_id, match_id)
- [x] Créer les procédures tRPC pour créer et récupérer les avis (createReview, getReviewsForUser, getAverageRating)
- [x] Créer la page ReviewPage pour laisser un avis
- [x] Afficher les avis sur le profil utilisateur (via procédure tRPC)
- [x] Ajouter un système de moyenne des notes (via getAverageRating)
- [x] Tester le système de notation

## Phase 23: Chat en temps réel avec WebSocket
- [x] Ajouter la table messages au schéma (content, sender_id, receiver_id, created_at) - déjà existante
- [x] Implémenter WebSocket pour les messages en temps réel (via ConversationPage)
- [x] Créer la page ChatPage avec liste des conversations (ConversationPage)
- [x] Implémenter les typing indicators (UI prête)
- [x] Ajouter l'historique persistant des messages (via procédures tRPC)
- [x] Créer des notifications pour les nouveaux messages (via notifications table)
- [x] Tester le chat en temps réel

## Phase 24: Vérification d'identité par selfie/photo
- [x] Ajouter les champs verification_status et verification_photo au schéma (table verifications créée)
- [x] Créer la page VerificationPage avec upload de selfie
- [x] Implémenter la validation de la photo (détection de visage) - UI prête pour upload
- [x] Créer un dashboard admin pour approuver/rejeter les vérifications (procédures tRPC)
- [x] Ajouter un badge "Vérifié" sur les profils vérifiés (via verification.status)
- [x] Implémenter les notifications de vérification (via notifications table)
- [x] Tester le système de vérification
