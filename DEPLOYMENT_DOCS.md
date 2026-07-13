# 🐾 Woofyz - Documentation Technique de Déploiement & Architecture

Ce document détaille l'infrastructure technique, les configurations d'environnement (Production, Préproduction & Nouvelle Préproduction), l'intégration des webhooks avec n8n pour les notifications WhatsApp, et les pipelines de déploiement automatique (CI/CD) mis en place sur votre VPS Hostinger.

---

## 🏗️ Architecture Globale

Le projet est composé de 4 couches applicatives principales fonctionnant ensemble sur le serveur VPS :

```mermaid
graph TD
    Client[📱 Client Mobile / Web App] -->|HTTPS| Nginx{🌐 Reverse Proxy Nginx}
    Nginx -->|Port 3000| ProdApp[🐾 Woofyz App - Production]
    Nginx -->|Port 3001| PreprodApp[🐾 Woofyz App - Préproduction]
    Nginx -->|Port 3002| NewPreprodApp[🐾 Woofyz App - New Préproduction (Branding)]
    Nginx -->|Port 5678| n8n[🧠 Automation n8n - Docker]
    
    ProdApp -->|Drizzle ORM| ProdDB[(🐬 MySQL: doggle)]
    PreprodApp -->|Drizzle ORM| PreprodDB[(🐬 MySQL: doggle_preprod)]
    NewPreprodApp -->|Drizzle ORM| PreprodDB
    
    ProdApp -->|POST Webhook| n8n
    PreprodApp -->|POST Webhook| n8n
    NewPreprodApp -->|POST Webhook| n8n
    
    n8n -->|API Twilio| WhatsApp((💬 API WhatsApp / Twilio))
```

---

## 🖥️ Spécifications du Serveur VPS

*   **Adresse IP** : `187.55.227.99`
*   **Utilisateur SSH** : `root` (Connexion par clé SSH sans mot de passe configurée)
*   **Système d'Exploitation** : Ubuntu 24.04 LTS
*   **Serveur Web / Reverse Proxy** : Nginx 1.24
*   **Gestionnaire de Processus Node.js** : PM2
*   **Conteneurisation** : Docker Engine (pour n8n)

---

## 🌐 Environnements de l'Application

L'application Woofyz est séparée en trois environnements hermétiques (bases de données et configurations isolées) :

### 1. Production (Branche `main`)
*   **URL Publique** : [https://woofyz.fr](https://woofyz.fr) / [https://www.woofyz.fr](https://www.woofyz.fr)
*   **Port Local** : `3000`
*   **Répertoire du Code** : `/var/www/woofyz`
*   **Nom du Processus PM2** : `woofyz`
*   **Base de Données MySQL** : `doggle`
*   **Fichier `.env` de production sur le serveur** :
    ```env
    PORT=3000
    DATABASE_URL=mysql://doggle_user:doggle2026_prod_pass@127.0.0.1:3306/doggle?multipleStatements=true
    JWT_SECRET=woofyz-prod-secret-key-9988776655
    N8N_WEBHOOK_URL=https://n8n.woofyz.fr/webhook/doggle-events
    ```

### 2. Préproduction (Branche `preprod`)
*   **URL Publique** : [https://preprod.woofyz.fr](https://preprod.woofyz.fr) (Accès direct : `http://187.55.227.99:3001`)
*   **Port Local** : `3001`
*   **Répertoire du Code** : `/var/www/woofyz-preprod`
*   **Nom du Processus PM2** : `woofyz-preprod`
*   **Base de Données MySQL** : `doggle_preprod`
*   **Fichier `.env` de préproduction sur le serveur** :
    ```env
    PORT=3001
    DATABASE_URL=mysql://doggle_user:doggle2026_prod_pass@127.0.0.1:3306/doggle_preprod?multipleStatements=true
    JWT_SECRET=woofyz-preprod-secret-key-1122334455
    N8N_WEBHOOK_URL=https://n8n.woofyz.fr/webhook-test/doggle-events
    ```

### 3. Nouvelle Préproduction / Branding Preview (Branche `feature/new-branding-identity`)
*   **URL Publique** : [https://newpreprod.woofyz.fr](https://newpreprod.woofyz.fr) (Accès direct : [http://187.55.227.99:3002](http://187.55.227.99:3002))
*   **Port Local** : `3002`
*   **Répertoire du Code** : `/var/www/woofyz-newpreprod`
*   **Nom du Processus PM2** : `woofyz-newpreprod`
*   **Base de Données MySQL** : `doggle_preprod` (partagée pour test)
*   **Fichier `.env` sur le serveur** :
    ```env
    PORT=3002
    DATABASE_URL=mysql://doggle_user:doggle2026_prod_pass@127.0.0.1:3306/doggle_preprod?multipleStatements=true
    JWT_SECRET=woofyz-newpreprod-secret-key-3344556677
    N8N_WEBHOOK_URL=https://n8n.woofyz.fr/webhook-test/doggle-events
    ```

---

## 🐬 Configuration MySQL (Serveur)

Un utilisateur dédié a été configuré avec les accès aux deux bases de données locales :

*   **Hôte** : `127.0.0.1:3306` (Local uniquement pour la sécurité)
*   **Utilisateur** : `doggle_user`
*   **Mot de passe** : `doggle2026_prod_pass`

### Commandes utiles pour administrer MySQL :
```bash
# Se connecter à MySQL en administrateur sur le serveur
mysql -u root

# Voir la liste des bases de données
mysql -e "SHOW DATABASES;"

# Exécuter les migrations manuellement sur le serveur
pnpm db:push
```

---

## 🧠 Instance d'Automatisation n8n

n8n fonctionne dans un conteneur Docker isolé avec des droits d'écriture persistants configurés.

*   **URL Publique** : [https://n8n.woofyz.fr](https://n8n.woofyz.fr)
*   **Port Local** : `5678`
*   **Dossier Persistant (Hôte VPS)** : `/opt/n8n` (Propriétaire UID `1000:1000` pour éviter les erreurs de permission `EACCES`)
*   **Commande Docker de démarrage** :
    ```bash
    docker run -d --name n8n \
      -p 5678:5678 \
      -v /opt/n8n:/home/node/.n8n \
      -e N8N_SECURE_COOKIE=false \
      --restart always \
      n8nio/n8n:latest
    ```

---

## 💬 Intégration Webhooks & WhatsApp (Twilio)

L'application Woofyz déclenche des appels HTTP POST vers n8n lors de 4 événements clés.

### 1. Variables Twilio Utilisées (dans n8n)
*   **Twilio Account SID** : `VOTRE_ACCOUNT_SID_TWILIO` (Disponible sur Twilio Console)
*   **Twilio Auth Token** : `VOTRE_AUTH_TOKEN_TWILIO` (Disponible sur Twilio Console)
*   **Numéro Sandbox WhatsApp Twilio** : `whatsapp:+14155238886`

### 2. Format des Webhooks (Payloads JSON envoyés à n8n)

#### Événement `match.created` (Nouveau Match)
Déclenché lorsque deux utilisateurs s'aiment mutuellement.
```json
{
  "event": "match.created",
  "timestamp": "2026-07-09T01:30:00.000Z",
  "data": {
    "user1": {
      "id": 1,
      "name": "Jean",
      "email": "jean@woofyz.fr",
      "phoneNumber": "+33611223344"
    },
    "user2": {
      "id": 2,
      "name": "Sophie",
      "email": "sophie@woofyz.fr",
      "phoneNumber": "+33655667788"
    },
    "compatibilityScore": 87
  }
}
```

#### Événement `message.received` (Nouveau Message de Chat)
Déclenché lorsqu'un utilisateur envoie un message dans la messagerie.
```json
{
  "event": "message.received",
  "timestamp": "2026-07-09T01:31:00.000Z",
  "data": {
    "matchId": 12,
    "content": "Bonjour ! On se promène quand ?",
    "sender": {
      "id": 1,
      "name": "Jean",
      "phoneNumber": "+33611223344"
    },
    "recipient": {
      "id": 2,
      "name": "Sophie",
      "phoneNumber": "+33655667788"
    }
  }
}
```

#### Événement `verification.updated` (Approbation/Rejet Admin)
Déclenché lorsqu'un administrateur valide ou rejette le profil de vérification d'un utilisateur.
```json
{
  "event": "verification.updated",
  "timestamp": "2026-07-09T01:32:00.000Z",
  "data": {
    "userId": 5,
    "status": "approved", // ou "rejected"
    "name": "Marc",
    "phoneNumber": "+33612345678",
    "reason": "Photo non conforme" // uniquement si rejeté
  }
}
```

#### Événement `profile.updated` (Modification de Profil)
Déclenché lorsqu'un utilisateur modifie les détails de son profil (très pratique pour tester le webhook).
```json
{
  "event": "profile.updated",
  "timestamp": "2026-07-09T01:33:00.000Z",
  "data": {
    "userId": 1,
    "name": "Jean",
    "email": "jean@woofyz.fr",
    "phoneNumber": "+33611223344",
    "age": 28,
    "bio": "Propriétaire d'un adorable Labrador."
  }
}
```

---

## 🚀 Pipeline de CI/CD (GitHub Actions)

*   **Repository GitHub** : `https://github.com/Misterhit0/woofyz`
*   **Secret de Dépôt Requis** : `VPS_SSH_KEY` (Clé privée SSH permettant à GitHub de se connecter au serveur).

### Workflow `.github/workflows/ci.yml` :
1.  **Test & Build** (Déclenché sur tout push / pull-request sur `main` et `preprod`) :
    *   Télécharge le code.
    *   Installe Node.js 20 et pnpm v10 (avec cache pour la rapidité).
    *   Installe les dépendances.
    *   Exécute les tests unitaires (`pnpm test`).
    *   Valide la compilation (`pnpm build`).
2.  **Déploiement Automatique** (Déclenché uniquement lors d'un `git push`) :
    *   Si push sur `main` ➔ Déploiement vers `/var/www/woofyz` et redémarrage de `pm2 restart woofyz`.
    *   Si push sur `preprod` ➔ Déploiement vers `/var/www/woofyz-preprod` et redémarrage de `pm2 restart woofyz-preprod`.

---

## 🧰 Cheat Sheet (Commandes Utiles sur le Serveur)

Pour exécuter ces commandes, connectez-vous d'abord à votre VPS depuis votre terminal Mac :
```bash
ssh root@187.55.227.99
```

### 1. Gérer l'application Woofyz (PM2)
```bash
# Voir le statut des processus (Production, Préprod & New Préprod)
pm2 status

# Lire les logs en temps réel
pm2 logs                 # Tous les logs
pm2 logs woofyz          # Uniquement la production
pm2 logs woofyz-preprod  # Uniquement la préproduction
pm2 logs woofyz-newpreprod # Uniquement la nouvelle prévisualisation

# Redémarrer une application
pm2 restart woofyz
pm2 restart woofyz-preprod
pm2 restart woofyz-newpreprod
```

### 2. Gérer n8n (Docker)
```bash
# Voir le statut du conteneur n8n
docker ps

# Redémarrer le conteneur n8n
docker restart n8n

# Lire les logs de n8n
docker logs n8n --tail 50
```

### 3. Gérer le serveur web (Nginx)
```bash
# Tester la syntaxe des configurations Nginx
nginx -t

# Recharger les configurations de Nginx sans coupure
systemctl reload nginx

# Statut du service Nginx
systemctl status nginx
```
