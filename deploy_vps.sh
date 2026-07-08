#!/bin/bash

# Configuration
VPS_IP="187.55.227.99"
REMOTE_USER="root"
APP_DIR="/var/www/doggle"

echo "=========================================================="
echo "🚀 DEPLOIEMENT DE DOGGLE & N8N SUR VOTRE VPS HOSTINGER"
echo "=========================================================="
echo "Adresse IP du VPS : $VPS_IP"
echo "Système ciblé     : Ubuntu 24.04 LTS"
echo "=========================================================="

# 1. Verification / Generation de la cle SSH locale
SSH_KEY="$HOME/.ssh/id_rsa"
if [ ! -f "${SSH_KEY}.pub" ]; then
    echo "🔑 Génération d'une clé SSH locale..."
    ssh-keygen -t rsa -b 4096 -N "" -f "$SSH_KEY"
fi

echo "📤 Configuration de l'accès SSH sans mot de passe..."
echo "Saisissez le mot de passe ROOT de votre VPS ci-dessous si demandé :"
ssh-copy-id -o ConnectTimeout=10 -i "${SSH_KEY}.pub" "${REMOTE_USER}@${VPS_IP}"

if [ $? -ne 0 ]; then
    echo "❌ Erreur : Impossible de copier la clé SSH. Vérifiez votre mot de passe et l'état du serveur."
    exit 1
fi

echo "✅ Accès SSH configuré avec succès !"

# 2. Demander si l'utilisateur possède des noms de domaine
echo "----------------------------------------------------------"
read -p "Avez-vous des noms de domaine configurés pour ce VPS ? (y/n) : " HAS_DOMAINS

DOGGLE_DOMAIN=""
N8N_DOMAIN=""

if [ "$HAS_DOMAINS" = "y" ] || [ "$HAS_DOMAINS" = "Y" ]; then
    read -p "Entrez le domaine pour Doggle (ex: doggle.mon-site.fr) : " DOGGLE_DOMAIN
    read -p "Entrez le domaine pour n8n (ex: n8n.mon-site.fr) : " N8N_DOMAIN
fi

# 3. Ecriture du script de configuration du serveur
echo "📝 Préparation du script de configuration du serveur..."
cat << 'EOF' > /tmp/server_setup.sh
#!/bin/bash
set -e

echo "⚙️ Mise à jour du système..."
apt-get update && apt-get upgrade -y

echo "📦 Installation des dépendances de base..."
apt-get install -y curl git rsync build-essential certbot python3-certbot-nginx ca-certificates gnupg

# Installation de Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installation de Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Demarrage de Docker
systemctl enable docker
systemctl start docker

# Installation de n8n via Docker
if ! docker ps -a --format '{{.Names}}' | grep -Eq "^n8n$"; then
    echo "🧠 Lancement de n8n via Docker..."
    mkdir -p /opt/n8n
    docker run -d --name n8n \
      -p 5678:5678 \
      -v /opt/n8n:/home/node/.n8n \
      -e N8N_SECURE_COOKIE=false \
      --restart always \
      n8nio/n8n:latest
fi

# Installation de Node.js 20 & PM2 sur l'hôte
if ! command -v node &> /dev/null; then
    echo "🟢 Installation de Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    npm install -g pnpm pm2
fi

# Installation de MySQL Server
if ! command -v mysql &> /dev/null; then
    echo "🐬 Installation de MySQL..."
    apt-get install -y mysql-server
    systemctl enable mysql
    systemctl start mysql

    echo "🔐 Configuration de la base de données..."
    mysql -e "CREATE DATABASE IF NOT EXISTS doggle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -e "CREATE USER IF NOT EXISTS 'doggle_user'@'localhost' IDENTIFIED BY 'doggle2026_prod_pass';"
    mysql -e "GRANT ALL PRIVILEGES ON doggle.* TO 'doggle_user'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"
fi

# Installation de Nginx
if ! command -v nginx &> /dev/null; then
    echo "🌐 Installation de Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
fi

echo "✅ Environnement serveur prêt !"
EOF

# Transfert et exécution du script de configuration
echo "📤 Transfert du script d'initialisation sur le VPS..."
scp /tmp/server_setup.sh "${REMOTE_USER}@${VPS_IP}:/tmp/server_setup.sh"
ssh "${REMOTE_USER}@${VPS_IP}" "bash /tmp/server_setup.sh"

# 4. Upload de l'application Doggle
echo "📤 Synchronisation du code de l'application..."
ssh "${REMOTE_USER}@${VPS_IP}" "mkdir -p $APP_DIR"
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'client/dist' --exclude '.env' ./ "${REMOTE_USER}@${VPS_IP}:${APP_DIR}/"

# 5. Build et démarrage de Doggle sur le serveur
echo "🏗️ Installation des dépendances et compilation de l'application..."
ssh "${REMOTE_USER}@${VPS_IP}" "cd $APP_DIR && \
  echo 'DATABASE_URL=mysql://doggle_user:doggle2026_prod_pass@127.0.0.1:3306/doggle?multipleStatements=true' > .env && \
  echo 'JWT_SECRET=doggle-prod-secret-key-9988776655' >> .env && \
  pnpm install && \
  pnpm db:push && \
  pnpm db:seed && \
  pnpm build"

echo "🚀 Démarrage de l'application avec PM2..."
ssh "${REMOTE_USER}@${VPS_IP}" "cd $APP_DIR && \
  pm2 delete doggle || true && \
  pm2 start dist/index.js --name doggle && \
  pm2 save && \
  pm2 startup"

# 6. Configuration des domaines et Nginx
echo "🌐 Configuration réseau Nginx..."
if [ -n "$DOGGLE_DOMAIN" ] && [ -n "$N8N_DOMAIN" ]; then
    echo "Configuring Nginx with domains: $DOGGLE_DOMAIN and $N8N_DOMAIN"
    
    # Nginx config for Doggle
    ssh "${REMOTE_USER}@${VPS_IP}" "cat << 'INNER_EOF' > /etc/nginx/sites-available/doggle
server {
    listen 80;
    server_name $DOGGLE_DOMAIN;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
INNER_EOF"

    # Nginx config for n8n
    ssh "${REMOTE_USER}@${VPS_IP}" "cat << 'INNER_EOF' > /etc/nginx/sites-available/n8n
server {
    listen 80;
    server_name $N8N_DOMAIN;
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
INNER_EOF"

    # Enable configs
    ssh "${REMOTE_USER}@${VPS_IP}" "ln -sf /etc/nginx/sites-available/doggle /etc/nginx/sites-enabled/ && \
      ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/ && \
      nginx -t && \
      systemctl reload nginx"

    echo "🔒 Génération des certificats SSL Let's Encrypt..."
    ssh "${REMOTE_USER}@${VPS_IP}" "certbot --nginx --non-interactive --agree-tos -m contact@$DOGGLE_DOMAIN -d $DOGGLE_DOMAIN -d $N8N_DOMAIN"
    
    echo "=========================================================="
    echo "🎉 CONFIGURATION TERMINEE AVEC SUCCES !"
    echo "=========================================================="
    echo "Doggle : https://$DOGGLE_DOMAIN"
    echo "n8n    : https://$N8N_DOMAIN"
    echo "=========================================================="
else
    # Simple configuration on default Nginx port (without domains)
    echo "⚠️ Aucun domaine fourni. Configuration par défaut sans SSL."
    echo "Nginx va écouter sur le port 80 pour Doggle et n8n sera accessible sur le port 5678."
    
    ssh "${REMOTE_USER}@${VPS_IP}" "cat << 'INNER_EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
INNER_EOF"
    ssh "${REMOTE_USER}@${VPS_IP}" "nginx -t && systemctl reload nginx"
    
    # Configure firewall rules on Ubuntu to open ports
    ssh "${REMOTE_USER}@${VPS_IP}" "ufw allow 80/tcp && ufw allow 5678/tcp && ufw allow 3000/tcp || true"
    
    echo "=========================================================="
    echo "🎉 CONFIGURATION TERMINEE AVEC SUCCES !"
    echo "=========================================================="
    echo "Doggle : http://$VPS_IP"
    echo "n8n    : http://$VPS_IP:5678"
    echo "=========================================================="
fi
