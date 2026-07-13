# Équipe de Lancement Stratégique & Administratif — Woofyz

## Paramètres Globaux d'Exécution (OpenRouter Gratuit)
- **Provider**: OpenRouter
- **Base_URL**: "https://openrouter.ai/api/v1"
- **API_Key**: "${OPENROUTER_API_KEY}"
- **LLM Engine**: `openchat/openchat-7b:free`

---

## 1. Agent Legal & Administrative Advisor (Expert INPI & Statuts)
- **Role**: Spécialiste du droit des affaires français et des formalités de création.
- **LLM Engine**: `openchat/openchat-7b:free`
- **Skills actifs**: `web-researcher-and-scraper`, `template-generator`
- **Tasks**:
  - Vérifier la disponibilité du nom de marque "Woofyz" auprès de la base INPI.
  - Rédiger la liste des classes de Nice adaptées à une webapp SaaS (ex: Classes 9, 35, 42).
  - Établir un comparatif des statuts juridiques (SASU vs. EURL) selon ton profil.

## 2. Agent Funding & Subventions Hunter (Expert Aides d'État et Locales)
- **Role**: Chasseur de financements publics (National, Régional, Départemental, Communal).
- **LLM Engine**: `openchat/openchat-7b:free`
- **Skills actifs**: `web-researcher-and-scraper`
- **Context géolocalisé**: Aubagne (13400), Métropole Aix-Marseille, Région PACA / Sud.
- **Tasks**:
  - Lister les aides éligibles (BPI France Bourse French Tech, Prêt d'honneur Initiative Pays d'Aubagne, aides à l'innovation régionales).
  - Extraire les critères d'éligibilité, les montants maximums et les dates limites de dépôt.

## 3. Agent Growth & Launch Manager (Le Product Manager du Lancement)
- **Role**: Planificateur stratégique du Go-To-Market.
- **LLM Engine**: `openchat/openchat-7b:free`
- **Skills actifs**: `doc-synchronizer`
- **Tasks**:
  - Créer un rétroplanning de lancement (Gantt en Markdown).
  - Rédiger le plan de lancement marketing (acquisition des premiers utilisateurs pour la webapp).

## 4. Agent Startup Strategist & Financial Architect
- **Role**: Expert en création de modèles économiques SaaS et structuration de Business Plans pour levées de fonds / prêts bancaires.
- **LLM Engine**: `openchat/openchat-7b:free`
- **Skills actifs**: `financial-modeler-and-forecaster`, `saas-metrics-architect`, `market-intelligence-analyzer`, `template-generator`
- **Tasks**:
  - [x] Définir l'architecture du Business Model de Woofyz.
  - Générer les tableaux financiers prévisionnels sur 3 ans (Excel/CSV et Markdown).
  - Rédiger l'Executive Summary et le dossier de Business Plan textuel.

---

### 🎨 Architecture du Business Model de Woofyz

Le modèle économique de Woofyz repose sur une stratégie hybride à forte récurrence (MRR - Monthly Recurring Revenue) :

                        ┌─────────────────────────┐
                        │     Plateforme Woofyz   │
                        └────────────┬────────────┘
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
   [ Modèle B2C : Propriétaires ]                  [ Modèle B2B : Professionnels ]
   ├── Offre Gratuite                              └── Pack Visibilité Pro
   └── WoofPass Premium (4,99 €/mois)              └── Abonnement (19,99 €/mois)
       (ou 39,99 €/an)                                 (ou 179,99 €/an)

#### 📊 Grille de Tarification Détaillée

| Modèle | Segment | Formule | Tarif Public (sans eng.) | Tarif Annuel (éq. mensuel) | Fonctionnalités Clés |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **B2C** | Propriétaires de chiens | **Standard (Gratuit)** | 0,00 € | 0,00 € | Recherche & Swipe standard (jusqu'à 10/jour), lecture forum entraide, maintien de 3 discussions actives simultanées en messagerie. |
| **B2C** | Propriétaires de chiens | **WoofPass Premium** | 4,99 € / mois | 39,99 € / an *(3,33 € / mois)* | **Mise en relation illimitée**, filtres comportementaux avancés, création de groupes de promenades privées, accès prioritaire aux rassemblements communautaires locaux, badge "Identité & Santé Chien Vérifiée". |
| **B2B** | Professionnels canins | **Pack Visibilité Pro** | 19,99 € / mois | 179,99 € / an *(14,99 € / mois)* | **Référencement prioritaire** dans l'annuaire, outil de prise de rendez-vous en ligne, messagerie professionnelle dédiée, publication d'articles conseils certifiés sur le forum, statistiques de visibilité mensuelles. |