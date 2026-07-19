# 📋 Carnet d'Évolutions — Woofyz

Ce carnet répertorie toutes les évolutions techniques, migrations de base de données, nouvelles routes tRPC, et interfaces frontend développées sur le projet.

---

## 🛠️ Historique des Commits (Récents)

*   `da8b79d` : Correction des conditions de course de date dans la suite de tests `lostDogs.test.ts`.
*   `a1d91c1` : Restriction stricte des chiens visibles par un profil de Dogsitter aux seuls chiens ayant l'option gardiennage activée.
*   `7ef05af` - `e961808` : Améliorations de l'infrastructure de déploiement VPS,pm2 restart, SSL et rebaptisation en **Woofyz**.
*   **Correction Bug Cartographie & Rendu** : Résolution de l'erreur React `Maximum update depth exceeded` (erreur #185) en migrant l'ensemble des marqueurs cartographiques (lieux, vétérinaires, dangers, promeneurs) vers des références stables (`useRef`) et en mémoïsant les filtres de rendu.
*   **Intégration KPIs Carte** : Ajout d'un widget récapitulant les objectifs hebdomadaires de distance et de durée (ainsi que la progression réelle de la semaine glissante) directement sur le tableau de bord de la carte (`WalkingMapPage.tsx`).

---

## 🚀 Évolutions par Phase (Roadmap Woofyz)

### 🔒 Phase 1 : Sécurité, Nettoyage & Services de Promenade
*   **Sécurisation de la messagerie** : Ajout d'une vérification stricte dans `message.sendMessage` tRPC pour empêcher l'envoi de messages si l'utilisateur ne fait pas partie du match.
*   **CRUD Chien & Signalement** :
    *   Suppression concrète et cascade SQL du chien dans la base de données.
    *   Implémentation de `lostDogs.markAsFound` pour basculer le statut de perte en `'found'`.
*   **Services de Promenade & Parrainage** : Création des tables de base de données et des routes d'achats/matching.
*   **Commits reliés** : *Phase 1 backend terminée et validée.*

### 🌳 Phase 2 : Lieux Dog-Friendly (Style PlayDogs)
*   **Base de données** : Table `dog_friendly_places` et `place_reviews` avec indexation spatiale via MySQL.
*   **Script d'Importation & Seeding** : [seed_dog_friendly_places.ts](file:///Users/cogepart/Documents/doggle-source-code-protected/woofmatch/scripts/seed_dog_friendly_places.ts) qui interroge automatiquement l'API Overpass d'OpenStreetMap pour extraire les parcs, plages, et hôtels locaux acceptant les chiens.
*   **Frontend & UI** :
    *   Ajout de filtres interactifs par type de lieu (Parc, Plage, Resto, etc.).
    *   Affichage de badges colorés personnalisés (🌳, 🏖️, 🍴, 🏨) sur MapLibre GL.
    *   Boîte de dialogue de détails, moyenne des avis communautaires et dépôt d'avis/note.

### 🏃 Phase 3 : Suivi GPS des Balades & Objectifs
*   **Base de données** : Tables `walks` et `walk_goals`.
*   **Suivi en Direct & LocalStorage** : Accumulation résiliente des points géographiques dans le `localStorage` en cas de coupure de réseau mobile.
*   **Rendu Cartographique** : Dessin à la volée d'une ligne de tracé en direct (`polyline` rose MapLibre) sur la carte.
*   **Widget & Progression Profil** : Intégration sur le Profil Utilisateur d'un widget de progression hebdomadaire par rapport aux objectifs fixés en km et en heures, et d'un panneau d'ajustement.

### ⚠️ Phase 4 : Alertes & Dangers Éphémères
*   **Base de données** : Table `danger_alerts`.
*   **Signalement** : Bouton sur la carte pour signaler un danger immédiat à sa position GPS (Cyanobactéries, appâts empoisonnés, verre pilé, etc.) avec date d'expiration.
*   **WhatsApp / Webhook n8n** : Envoi automatique d'alertes via webhook à n8n pour avertir par message tous les maîtres dans un rayon de 5 km.

### 🏥 Phase 5 : Espace Santé & Vétérinaire (Doctolib Style)
*   **Base de données** : Tables `pet_health_records`, `pet_vaccines`, `pet_documents`, `veterinarians`, `vet_slots`, `vet_appointments`.
*   **Dossier Médical** : Suivi du poids, des allergies, antécédents et traitements.
*   **Vaccins & Docs** : Log d'injections avec statut de validité (`active` / `overdue`) et archivage de fichiers d'ordonnance PDF.
*   **Partage Dogsitter** : Partage automatique et sécurisé du carnet médical aux dogsitters assignés.
*   **Réservation Doctolib** : Recherche de cliniques vétérinaires proches, réservation de créneaux en direct (Option B praticiens partenaires) ou saisie libre (Option A) avec notifications par e-mail et WhatsApp.
