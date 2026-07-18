---
title: Woofyz - Project Analysis
tags:
  - woofyz
  - analysis
  - documentation
aliases:
  - Project Analysis
  - analysis_results
date: 2026-07-15
---

# Woofyz - Project Analysis

This document provides a comprehensive technical analysis of the **Woofyz** project. It details the project's purpose, technologies, system architecture, database schema, access control features, and current status. For detailed rules see [[BUSINESS_RULES]] and [[ARCHITECTURE]].

---

## 📋 Project Overview & Main Stakes

**Woofyz** is a dog-and-owner matching social platform, similar in function to swipe-matching apps but tailored for dog socialization, walks, lost dogs assistance, and master collaborations.

### Key Goals
- **Dog & Master Social Networking**: Allow owners to match with nearby dog owners based on mutual dog compatibility and master affinity.
- **Lost & Found Dogs Assistance**: Provide rapid reporting and sighting tracking with real-time location mapping.
- **Safety & Identity Verification**: Prevent fake profiles through identity verification via photo/selfie uploads.
- **Events & Community**: Facilitate group walks, training, or local meetups.
- **Monetization & Services**: Support marketplace sponsorships and dog-walking services.
- **Strict Access Control**: Protect the codebase and deployment from unauthorized modifications using a localized token-based security check.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 7, Tailwind CSS v4, Wouter (Routing), Radix UI (Primitives), Framer Motion, Recharts, Sonner, Embla Carousel |
| **Backend** | Node.js, Express, tRPC (v11), TypeScript, bcryptjs, jose (JWT) |
| **Database** | MySQL, Drizzle ORM |
| **Access Control** | Node-based CLI security script (`doggle-access-control.js`), Git Attributes, Git hooks (`pre-commit`) |
| **Testing** | Vitest |

---

## 📁 Codebase Structure

```
doggle-source-code-protected/
├── ACCESS_CONTROL_README.md                   # Documentation for the security/access system
├── doggle-access-control.js                   # Node CLI access control enforcement utility
├── DOGGLE - SYSTÈME DE CONTRÔLE D'ACCÈS.pdf   # Official security/access system PDF guidelines
└── woofmatch/                                 # Main application folder
    ├── client/                                # React Frontend
    │   ├── src/
    │   │   ├── App.tsx                        # Main App router and layout definitions
    │   │   ├── main.tsx                       # Entrypoint
    │   │   ├── components/                    # UI elements, Memphis Background, AppNav
    │   │   ├── contexts/                      # Theme and other React contexts
    │   │   ├── hooks/                         # React custom hooks
    │   │   ├── pages/                         # App views (Discovery, WalkingMap, Verification, etc.)
    │   │   └── lib/                           # Helper functions, tRPC client wrappers
    │   └── index.html
    ├── server/                                # Express + tRPC Backend
    │   ├── _core/                             # Express server, authentication helpers, LLM, APIs
    │   ├── db.ts                              # Database query helpers
    │   ├── routers.ts                         # tRPC router declarations and business logic
    │   └── storage.ts                         # Storage configurations
    ├── drizzle/                               # DB Migrations and Schema definition
    │   ├── schema.ts                          # Drizzle schema definitions
    │   └── relations.ts                       # Table relations definitions
    ├── shared/                                # Shared types and logic between Client & Server
    │   ├── compatibilityEngine.ts             # Smart dog-matching compatibility algorithm
    │   └── const.ts                           # Shared constants
    ├── todo.md                                # Project phase logs & feature checkpoints
    ├── tsconfig.json
    ├── vite.config.ts                         # Vite configuration
    └── package.json                           # Workspace dependency map
```

---

## 🗄️ Database Schema & Relationships

The project's database is modeled using **Drizzle ORM for MySQL** (`drizzle/schema.ts`):

```mermaid
erDiagram
    users ||--o{ dogs : owns
    users ||--o{ swipes : performs
    users ||--o{ matches : participates_in
    users ||--o{ messages : sends
    users ||--o{ notifications : receives
    users ||--o{ reviews : writes_or_receives
    users ||--|| verifications : undergoes
    matches ||--o{ messages : groups

    users {
        int id PK
        varchar openId UNIQUE
        text name
        varchar email UNIQUE
        varchar hashedPassword
        varchar loginMethod
        mysqlEnum role "user, admin"
        int age
        json interests "string[]"
        text walkingHabits
        json whatISeek "string[]"
        text bio
        varchar profilePhotoUrl
        double latitude
        double longitude
        timestamp lastLocationUpdate
        double homeLatitude
        double homeLongitude
        boolean isShareLocationActive
        timestamp createdAt
        timestamp updatedAt
        timestamp lastSignedIn
    }

    dogs {
        int id PK
        int userId FK
        varchar name
        varchar breed
        int age
        text description
        json personality "string[]"
        json photoUrls "string[]"
        timestamp createdAt
        timestamp updatedAt
    }

    swipes {
        int id PK
        int userId FK
        int targetUserId FK
        boolean liked
        timestamp createdAt
    }

    matches {
        int id PK
        int userId1 FK
        int userId2 FK
        decimal compatibilityScore
        timestamp createdAt
    }

    messages {
        int id PK
        int matchId FK
        int senderId FK
        text content
        boolean read
        timestamp createdAt
    }

    notifications {
        int id PK
        int userId FK
        mysqlEnum type "match, message, system"
        varchar title
        text content
        boolean read
        int relatedMatchId FK
        timestamp createdAt
    }

    reviews {
        int id PK
        int reviewerId FK
        int reviewedId FK
        int matchId FK
        int rating "1-5 stars"
        text comment
        timestamp createdAt
    }

    verifications {
        int id PK
        int userId FK UNIQUE
        varchar photoUrl
        mysqlEnum status "pending, approved, rejected"
        text rejectionReason
        timestamp verifiedAt
        timestamp createdAt
        timestamp updatedAt
    }
```

---

## 🔑 Access Control System

The codebase contains a specific security measure to restrict developers and users from modifying critical system infrastructure.

### Authorized Roles
- **Admin**: Full access. Can view, write, delete, and deploy. Only Admins can modify protected files or critical read-only entities.
- **Developer**: Restricted to editing non-critical components. Has `read` and standard `write` permissions.
- **Viewer**: Read-only permission.

### File Classifications

| File Path | Description | Access Restrictions |
| :--- | :--- | :--- |
| `server/routers.ts` | tRPC Procedures | Protected (Admin-only modification) |
| `server/db.ts` | DB Helpers | Protected (Admin-only modification) |
| `drizzle/schema.ts` | DB Schema | Protected & Read-Only |
| `server/_core/index.ts` | Server Config | Protected (Admin-only modification) |
| `server/_core/context.ts` | tRPC Context | Protected (Admin-only modification) |
| `client/src/lib/trpc.ts` | tRPC Client wrapper | Protected (Admin-only modification) |
| `server/_core/env.ts` | Environment variables | Read-Only (Cannot be modified) |
| `server/_core/oauth.ts` | OAuth credentials | Read-Only (Cannot be modified) |

### Git hook Protection
A `.git/hooks/pre-commit` hook is documented to prevent modifications to `server/routers.ts`, `server/db.ts`, and `drizzle/schema.ts` unless the user's signature is verified as an administrator key.

---

## 🤖 Smart Compatibility Engine (`shared/compatibilityEngine.ts`)

Matches are scored with a weighted algorithm: **60% Dog Compatibility** + **40% Master Affinity**.

- **Dog Compatibility (60%)**
  - **Personality Match (50% of dog score)**: HSL-aligned compatibility matrix mapping traits like `playful`, `calm`, `energetic`, `shy`.
  - **Age Alignment (30% of dog score)**: Difference in age yields decreasing compatibility.
  - **Breed Compatibility (20% of dog score)**: Predefined matrix measuring breed socialization traits (e.g. retrievers have high affinity).
- **Master Affinity (40%)**
  - **Interests Alignment (40% of master score)**: Checking overlapping activities like `hiking`, `parks`, `cafes`.
  - **Walking Habits (35% of master score)**: Alignment of daily schedule (morning, evening, frequent).
  - **What I Seek (25% of master score)**: Compatibility of expectations (friend, mentor, intergenerational support).

---

## 🧪 Current Project Status & Test Results

The application's testing suite consists of 12 tests inside `vitest`. When running the test commands locally:
- **All 12 tests passed successfully**.
- DB connection errors are safely ignored/mocked during testing if database servers are local or simulated.

All phases of implementation (Phases 1-24) have been completed according to `todo.md`.
