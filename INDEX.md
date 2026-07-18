---
title: Woofyz Obsidian Vault Index
tags:
  - woofyz
  - index
  - documentation
  - map
aliases:
  - Index
  - INDEX
  - Vault Map
date: 2026-07-15
---

# 🐾 Woofyz Obsidian Vault Index

Bienvenue dans le coffre (Vault) de documentation de **Woofyz**. Ce document sert de carte d'orientation pour naviguer à travers l'architecture technique, les règles métier, les processus de déploiement et les plans de lancement.

---

## 🗺️ Carte d'Orientation (Graph Diagram)

```mermaid
graph TD
    %% Nodes
    Index["INDEX.md (Cette Carte)"]
    Claude["CLAUDE.md (Workflow Dev)"]
    Instructions["AI_INSTRUCTIONS.md (Règles IA)"]
    Agents["AGENTS.md (Équipe & Business)"]
    
    BizRules["BUSINESS_RULES.md (Règles Métier)"]
    Compat["COMPATIBILITY_ALGORITHM.md (Matching)"]
    Pages["PAGES.md (Inventory UI/Pages)"]
    
    Arch["ARCHITECTURE.md (Codebase & DB)"]
    Deploy["DEPLOYMENT_DOCS.md (VPS & CI/CD)"]
    Access["ACCESS_CONTROL_README.md (Sécurité)"]
    
    Analysis["analysis_results.md (Audit Technique)"]
    Marketing["marketing_strategies_france.md (Acquisition)"]
    Evolution["PROJECT_EVOLUTION.md (Historique)"]

    %% Links
    Index --> Claude
    Index --> BizRules
    Index --> Arch
    Index --> Analysis
    
    Claude --> Instructions
    Instructions --> Agents
    
    BizRules --> Compat
    BizRules --> Pages
    
    Arch --> Access
    Arch --> Deploy
    
    Analysis --> Marketing
    Analysis --> Evolution

    %% Style classes
    classDef main fill:#5C5CFF,stroke:#111,stroke-width:2px,color:#fff;
    classDef biz fill:#FF7C5C,stroke:#111,stroke-width:2px,color:#fff;
    classDef tech fill:#7CFF5C,stroke:#111,stroke-width:2px,color:#000;
    classDef strategic fill:#FFD25C,stroke:#111,stroke-width:2px,color:#000;
    
    class Index main;
    class Claude,Instructions,Agents main;
    class BizRules,Compat,Pages biz;
    class Arch,Deploy,Access tech;
    class Analysis,Marketing,Evolution strategic;
    
    class Index,Claude,Instructions,Agents,BizRules,Compat,Pages,Arch,Deploy,Access,Analysis,Marketing,Evolution internal-link;
```

---

## 📂 Navigation par Thématique

### 🛠️ Général & Développement
- **[[CLAUDE]]** : Le guide de référence pour le workflow de développement obligatoire (branches, commits, tests, commandes PM2).
- **[[AI_INSTRUCTIONS]]** : Directives spécifiques pour les assistants de programmation IA (Gemini, Claude, Cursor).
- **[[AGENTS]]** : Configuration de l'équipe d'agents de lancement et architecture financière/grille de tarifs.

### 📐 Spécifications & Règles Métier
- **[[BUSINESS_RULES]]** : Description précise de la logique métier (authentification, swipes, messagerie, webhooks n8n, stubs).
- **[[COMPATIBILITY_ALGORITHM]]** : Fonctionnement complet de l'algorithme de compatibilité Chien-Chien (B2C) et Chien-Sitter (B2B).
- **[[PAGES]]** : Inventaire de toutes les pages/routes de l'application et les actions utilisateur possibles.

### 🏗️ Architecture, Sécurité & Déploiement
- **[[ARCHITECTURE]]** : Arborescence complète du projet, stack technique, et structure des tables Drizzle / SQL brut.
- **[[DEPLOYMENT_DOCS]]** : Architecture VPS, configurations Nginx/Docker/PM2, variables d'environnement, et pipelines CI/CD.
- **[[docs/ACCESS_CONTROL_README|ACCESS_CONTROL_README]]** : Guide d'utilisation du système de restriction d'accès aux fichiers critiques.

### 📈 Lancement & Analyse Stratégique
- **[[docs/analysis_results|analysis_results]]** : Rapport technique initial et structure générale du projet.
- **[[docs/marketing_strategies_france|marketing_strategies_france]]** : Stratégie de Guerilla Marketing et d'acquisition de micro-influence avec un budget lean de 200 €.
- **[[docs/PROJECT_EVOLUTION|PROJECT_EVOLUTION]]** : Historique des modifications majeures apportées au projet Woofyz.
