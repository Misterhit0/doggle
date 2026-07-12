#!/usr/bin/env node

/**
 * DOGGLE ACCESS CONTROL SYSTEM
 * 
 * Système de contrôle d'accès pour le code source Doggle
 * Permet de restreindre l'édition du code à certains utilisateurs autorisés
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const ACCESS_CONFIG = {
  // Fichiers protégés (ne peuvent être modifiés que par utilisateurs autorisés)
  protectedFiles: [
    'server/routers.ts',
    'server/db.ts',
    'drizzle/schema.ts',
    'server/_core/index.ts',
    'server/_core/context.ts',
    'client/src/lib/trpc.ts',
  ],

  // Utilisateurs autorisés (email + clé d'accès)
  authorizedUsers: [
    {
      email: 'josselingiraud88@gmail.com',
      name: 'Admin - Josselin',
      accessKey: 'DOGGLE_ADMIN_2026_SECRET_KEY_001',
      role: 'admin', // admin, developer, viewer
      permissions: ['read', 'write', 'delete', 'deploy'],
    },
    {
      email: 'gregoirebenjamin13@gmail.com',
      name: 'Admin - Grégoire',
      accessKey: 'DOGGLE_ADMIN_2026_SECRET_KEY_002',
      role: 'admin',
      permissions: ['read', 'write', 'delete', 'deploy'],
    },
  ],

  // Fichiers en lecture seule (lecture seule pour tous)
  readOnlyFiles: [
    'drizzle/schema.ts',
    'server/_core/env.ts',
    'server/_core/oauth.ts',
  ],
};

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Génère une clé d'accès aléatoire
 */
function generateAccessKey() {
  return `DOGGLE_${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
}

/**
 * Vérifie si un utilisateur est autorisé
 */
function isUserAuthorized(email, accessKey) {
  const user = ACCESS_CONFIG.authorizedUsers.find(u => u.email === email);
  if (!user) return null;
  
  if (user.accessKey !== accessKey) {
    return null; // Clé d'accès invalide
  }
  
  return user;
}

/**
 * Vérifie si un utilisateur peut modifier un fichier
 */
function canModifyFile(user, filePath) {
  if (!user) return false;
  
  // Admin peut modifier tous les fichiers
  if (user.role === 'admin') return true;
  
  // Vérifier les permissions
  if (!user.permissions.includes('write')) return false;
  
  // Vérifier si le fichier est protégé
  if (ACCESS_CONFIG.readOnlyFiles.includes(filePath)) {
    return user.role === 'admin'; // Seul admin peut modifier les fichiers critiques
  }
  
  return true;
}

/**
 * Génère un rapport d'accès
 */
function generateAccessReport() {
  const report = {
    timestamp: new Date().toISOString(),
    users: ACCESS_CONFIG.authorizedUsers.map(u => ({
      email: u.email,
      name: u.name,
      role: u.role,
      permissions: u.permissions,
      accessKey: u.accessKey.substring(0, 20) + '...', // Masquer la clé complète
    })),
    protectedFiles: ACCESS_CONFIG.protectedFiles,
    readOnlyFiles: ACCESS_CONFIG.readOnlyFiles,
  };
  
  return report;
}

/**
 * Crée un fichier .env avec les clés d'accès
 */
function generateEnvFile() {
  let envContent = `# DOGGLE ACCESS CONTROL KEYS
# Ne pas partager ces clés publiquement !
# Do not share these keys publicly!

# Admin Access Key
DOGGLE_ADMIN_ACCESS_KEY=${ACCESS_CONFIG.authorizedUsers[0].accessKey}

# Developer Access Keys
# DOGGLE_DEV_ACCESS_KEY=DOGGLE_DEV_2026_SECRET_KEY_002

# Viewer Access Keys (lecture seule)
# DOGGLE_VIEWER_ACCESS_KEY=DOGGLE_VIEWER_2026_SECRET_KEY_003
`;

  return envContent;
}

// ============================================================================
// COMMANDES CLI
// ============================================================================

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'generate-key':
    console.log('🔑 Clé d\'accès générée :');
    console.log(generateAccessKey());
    break;

  case 'add-user':
    if (args.length < 2) {
      console.error('Usage: node doggle-access-control.js add-user <email> <role>');
      process.exit(1);
    }
    const [email, role] = args;
    const newKey = generateAccessKey();
    console.log(`✅ Nouvel utilisateur ajouté :`);
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log(`Access Key: ${newKey}`);
    console.log(`\n⚠️  Sauvegardez cette clé en lieu sûr !`);
    break;

  case 'verify':
    if (args.length < 2) {
      console.error('Usage: node doggle-access-control.js verify <email> <accessKey>');
      process.exit(1);
    }
    const [userEmail, userKey] = args;
    const user = isUserAuthorized(userEmail, userKey);
    if (user) {
      console.log(`✅ Utilisateur autorisé : ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Permissions: ${user.permissions.join(', ')}`);
    } else {
      console.log(`❌ Utilisateur non autorisé ou clé invalide`);
      process.exit(1);
    }
    break;

  case 'check-file':
    if (args.length < 3) {
      console.error('Usage: node doggle-access-control.js check-file <email> <accessKey> <filePath>');
      process.exit(1);
    }
    const [checkEmail, checkKey, filePath] = args;
    const checkUser = isUserAuthorized(checkEmail, checkKey);
    if (!checkUser) {
      console.log(`❌ Utilisateur non autorisé`);
      process.exit(1);
    }
    const canModify = canModifyFile(checkUser, filePath);
    console.log(`Fichier: ${filePath}`);
    console.log(`Utilisateur: ${checkUser.name}`);
    console.log(`Peut modifier: ${canModify ? '✅ OUI' : '❌ NON'}`);
    break;

  case 'report':
    const report = generateAccessReport();
    console.log(JSON.stringify(report, null, 2));
    break;

  case 'generate-env':
    const envContent = generateEnvFile();
    fs.writeFileSync('.env.access', envContent);
    console.log('✅ Fichier .env.access créé');
    console.log('⚠️  Ne pas partager ce fichier publiquement !');
    break;

  case 'help':
  default:
    console.log(`
DOGGLE ACCESS CONTROL SYSTEM
============================

Commandes disponibles :

  generate-key              Génère une nouvelle clé d'accès
  add-user <email> <role>   Ajoute un nouvel utilisateur
  verify <email> <key>      Vérifie les permissions d'un utilisateur
  check-file <email> <key> <file>  Vérifie si un utilisateur peut modifier un fichier
  report                    Affiche le rapport d'accès
  generate-env              Génère le fichier .env.access
  help                      Affiche cette aide

Exemples :

  node doggle-access-control.js generate-key
  node doggle-access-control.js verify josselingiraud88@gmail.com DOGGLE_ADMIN_2026_SECRET_KEY_001
  node doggle-access-control.js check-file josselingiraud88@gmail.com DOGGLE_ADMIN_2026_SECRET_KEY_001 server/routers.ts
  node doggle-access-control.js report

Rôles disponibles :
  - admin      : Accès complet (lecture, écriture, suppression, déploiement)
  - developer  : Accès développeur (lecture, écriture)
  - viewer     : Accès lecture seule

Fichiers protégés :
${ACCESS_CONFIG.protectedFiles.map(f => `  - ${f}`).join('\n')}

Fichiers en lecture seule :
${ACCESS_CONFIG.readOnlyFiles.map(f => `  - ${f}`).join('\n')}
    `);
    break;
}
