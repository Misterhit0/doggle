# DOGGLE - SYSTÈME DE CONTRÔLE D'ACCÈS

## 📋 Vue d'ensemble

Ce système de contrôle d'accès permet de **restreindre l'édition du code source Doggle** à certains utilisateurs autorisés uniquement.

**Fonctionnalités** :
- ✅ Authentification par email + clé d'accès
- ✅ Rôles utilisateur (Admin, Developer, Viewer)
- ✅ Permissions granulaires (read, write, delete, deploy)
- ✅ Fichiers protégés (ne peuvent être modifiés que par admin)
- ✅ Fichiers en lecture seule
- ✅ Audit d'accès

---

## 🔑 Clés d'Accès

### Admin (Josselin)

```
Email: josselingiraud88@gmail.com
Access Key: DOGGLE_ADMIN_2026_SECRET_KEY_001
Role: admin
Permissions: read, write, delete, deploy
```

**Accès complet** : Peut modifier tous les fichiers, y compris les fichiers critiques.

### Ajouter Nouveaux Utilisateurs

```bash
# Générer une nouvelle clé d'accès
node doggle-access-control.js generate-key

# Résultat : DOGGLE_DEV_2026_SECRET_KEY_XXXXXXXX
```

Puis ajouter l'utilisateur au fichier `doggle-access-control.js` :

```javascript
{
  email: 'developer@example.com',
  name: 'Developer Name',
  accessKey: 'DOGGLE_DEV_2026_SECRET_KEY_002',
  role: 'developer',
  permissions: ['read', 'write'],
}
```

---

## 👥 Rôles et Permissions

### Admin
- **Permissions** : read, write, delete, deploy
- **Peut modifier** : Tous les fichiers
- **Cas d'usage** : Fondateur, CTO, Lead Developer

### Developer
- **Permissions** : read, write
- **Peut modifier** : Fichiers non-critiques
- **Cas d'usage** : Développeurs de l'équipe

### Viewer
- **Permissions** : read
- **Peut modifier** : Aucun fichier
- **Cas d'usage** : Consultants, auditeurs, investisseurs

---

## 🔒 Fichiers Protégés

Ces fichiers **ne peuvent être modifiés que par les administrateurs** :

```
- server/routers.ts          (Procédures tRPC)
- server/db.ts              (Helpers base de données)
- drizzle/schema.ts         (Schéma base de données)
- server/_core/index.ts     (Configuration serveur)
- server/_core/context.ts   (Contexte tRPC)
- client/src/lib/trpc.ts    (Client tRPC)
```

### Fichiers en Lecture Seule

Ces fichiers **ne peuvent pas être modifiés par les utilisateurs** :

```
- drizzle/schema.ts         (Schéma base de données)
- server/_core/env.ts       (Variables d'environnement)
- server/_core/oauth.ts     (Configuration OAuth)
```

---

## 🛠️ Utilisation du Système

### 1. Vérifier les Permissions d'un Utilisateur

```bash
node doggle-access-control.js verify josselingiraud88@gmail.com DOGGLE_ADMIN_2026_SECRET_KEY_001
```

**Résultat** :
```
✅ Utilisateur autorisé : Admin - Josselin
Role: admin
Permissions: read, write, delete, deploy
```

### 2. Vérifier si un Utilisateur Peut Modifier un Fichier

```bash
node doggle-access-control.js check-file josselingiraud88@gmail.com DOGGLE_ADMIN_2026_SECRET_KEY_001 server/routers.ts
```

**Résultat** :
```
Fichier: server/routers.ts
Utilisateur: Admin - Josselin
Peut modifier: ✅ OUI
```

### 3. Générer un Rapport d'Accès

```bash
node doggle-access-control.js report
```

**Résultat** :
```json
{
  "timestamp": "2026-07-03T10:30:00.000Z",
  "users": [
    {
      "email": "josselingiraud88@gmail.com",
      "name": "Admin - Josselin",
      "role": "admin",
      "permissions": ["read", "write", "delete", "deploy"],
      "accessKey": "DOGGLE_ADMIN_2026_SECRET_..."
    }
  ],
  "protectedFiles": [...],
  "readOnlyFiles": [...]
}
```

### 4. Générer le Fichier .env.access

```bash
node doggle-access-control.js generate-env
```

**Résultat** : Crée `.env.access` avec toutes les clés d'accès

⚠️ **Ne pas partager ce fichier publiquement !**

---

## 🔐 Sécurité

### Bonnes Pratiques

1. **Protégez les clés d'accès** :
   - Ne partagez jamais les clés par email ou Slack
   - Utilisez un gestionnaire de secrets (1Password, LastPass)
   - Stockez `.env.access` en lieu sûr

2. **Rotation des clés** :
   - Changez les clés tous les 6 mois
   - Révoquez les clés des utilisateurs qui partent
   - Générez de nouvelles clés pour chaque nouvel utilisateur

3. **Audit d'accès** :
   - Exécutez `node doggle-access-control.js report` régulièrement
   - Vérifiez qui a accès à quoi
   - Documentez les changements

### Révocation d'Accès

Pour révoquer l'accès d'un utilisateur :

1. Ouvrez `doggle-access-control.js`
2. Supprimez l'utilisateur de `ACCESS_CONFIG.authorizedUsers`
3. Sauvegardez et commitez

```javascript
// Avant
{
  email: 'developer@example.com',
  name: 'Developer',
  accessKey: 'DOGGLE_DEV_2026_SECRET_KEY_002',
  role: 'developer',
  permissions: ['read', 'write'],
}

// Après (supprimé)
```

---

## 🚀 Intégration avec Git

### Protéger les Fichiers Critiques

Créez un fichier `.gitattributes` pour protéger les fichiers critiques :

```gitattributes
# Fichiers protégés (lecture seule)
server/routers.ts merge=ours
server/db.ts merge=ours
drizzle/schema.ts merge=ours
server/_core/index.ts merge=ours
```

### Configurer Git Hooks

Créez `.git/hooks/pre-commit` pour vérifier les permissions avant de commiter :

```bash
#!/bin/bash

# Vérifier que seul l'admin peut modifier les fichiers protégés
PROTECTED_FILES=(
  "server/routers.ts"
  "server/db.ts"
  "drizzle/schema.ts"
)

for file in "${PROTECTED_FILES[@]}"; do
  if git diff --cached --name-only | grep -q "^$file$"; then
    echo "❌ Erreur : Vous ne pouvez pas modifier $file"
    echo "Seul l'admin peut modifier ce fichier"
    exit 1
  fi
done

exit 0
```

---

## 📊 Audit Trail

Pour auditer qui a modifié quoi et quand :

```bash
# Voir l'historique Git
git log --oneline server/routers.ts

# Voir les détails d'une modification
git show <commit-hash>

# Voir qui a modifié une ligne spécifique
git blame server/routers.ts
```

---

## 🆘 Dépannage

### Problème : "Utilisateur non autorisé"

**Cause** : Email ou clé d'accès invalide

**Solution** :
1. Vérifiez l'email (casse sensible)
2. Vérifiez la clé d'accès (casse sensible)
3. Contactez l'admin pour obtenir une nouvelle clé

### Problème : "Vous n'avez pas la permission de modifier ce fichier"

**Cause** : Votre rôle n'a pas la permission `write`

**Solution** :
1. Vérifiez votre rôle (`node doggle-access-control.js verify <email> <key>`)
2. Contactez l'admin pour augmenter vos permissions
3. Utilisez un compte admin si vous avez besoin de modifier des fichiers protégés

### Problème : "Fichier en lecture seule"

**Cause** : Le fichier est marqué comme lecture seule

**Solution** :
1. Vérifiez que c'est vraiment un fichier critique
2. Contactez l'admin pour obtenir une exception
3. Utilisez un compte admin si vous êtes autorisé

---

## 📝 Exemples d'Utilisation

### Exemple 1 : Ajouter un Développeur

```bash
# 1. Générer une clé d'accès
node doggle-access-control.js generate-key
# Résultat : DOGGLE_DEV_2026_SECRET_KEY_ABC123

# 2. Ajouter l'utilisateur au fichier doggle-access-control.js
# (voir section "Ajouter Nouveaux Utilisateurs")

# 3. Vérifier que l'utilisateur est autorisé
node doggle-access-control.js verify developer@example.com DOGGLE_DEV_2026_SECRET_KEY_ABC123
# Résultat : ✅ Utilisateur autorisé : Developer

# 4. Vérifier les permissions pour un fichier spécifique
node doggle-access-control.js check-file developer@example.com DOGGLE_DEV_2026_SECRET_KEY_ABC123 client/src/pages/Home.tsx
# Résultat : Peut modifier: ✅ OUI
```

### Exemple 2 : Révoquer l'Accès d'un Utilisateur

```bash
# 1. Vérifier l'accès actuel
node doggle-access-control.js report

# 2. Supprimer l'utilisateur du fichier doggle-access-control.js

# 3. Vérifier que l'utilisateur n'a plus accès
node doggle-access-control.js verify developer@example.com DOGGLE_DEV_2026_SECRET_KEY_ABC123
# Résultat : ❌ Utilisateur non autorisé ou clé invalide
```

### Exemple 3 : Auditer les Modifications

```bash
# 1. Voir qui a modifié server/routers.ts
git log --oneline server/routers.ts

# 2. Voir les détails d'une modification
git show <commit-hash>

# 3. Voir qui a modifié une ligne spécifique
git blame server/routers.ts | grep "const discovery"
```

---

## 📞 Support

Pour des questions ou des problèmes :

1. **Vérifiez ce README** : La plupart des problèmes sont documentés
2. **Exécutez `help`** : `node doggle-access-control.js help`
3. **Contactez l'admin** : josselingiraud88@gmail.com

---

## 📜 Licence

Ce système de contrôle d'accès est propriétaire à Doggle. Tous les droits réservés.

**Utilisation** : Réservé aux utilisateurs autorisés uniquement.

---

**Document créé** : Juillet 2026
**Version** : 1.0
