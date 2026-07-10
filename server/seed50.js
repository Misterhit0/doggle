const mysql = require('mysql2/promise');
const fs = require('fs');

async function seed() {
  // Determine database URL from local .env
  let dbUrl = 'mysql://doggle_user:doggle2026_prod_pass@127.0.0.1:3306/doggle_preprod?multipleStatements=true';
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) {
      dbUrl = match[1].trim();
    }
  }

  console.log('[Seeder] Connecting to database using url:', dbUrl.split('@')[1] || dbUrl);
  const connection = await mysql.createConnection(dbUrl);

  const firstNames = [
    'Thomas', 'Lucas', 'Léo', 'Hugo', 'Louis', 'Nathan', 'Arthur', 'Enzo', 'Jules', 'Gabriel',
    'Emma', 'Léa', 'Chloé', 'Manon', 'Inès', 'Sarah', 'Camille', 'Jade', 'Clara', 'Zoé',
    'Maxime', 'Antoine', 'Paul', 'Alexandre', 'Julien', 'Nicolas', 'Mathieu', 'Clément', 'Romain', 'Florian',
    'Alice', 'Mathilde', 'Julie', 'Laura', 'Marie', 'Pauline', 'Elodie', 'Anaïs', 'Lucie', 'Charlotte',
    'Sébastien', 'Guillaume', 'Pierre', 'Adrien', 'Benoît', 'Sophie', 'Caroline', 'Cécile', 'Amandine', 'Aurélie'
  ];

  const lastNames = [
    'Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent',
    'Simon', 'Michel', 'Lefevre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard',
    'Bonnet', 'Dupont', 'Lambert', 'Fontaine', 'Rousseau', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas'
  ];

  const dogNames = [
    'Buddy', 'Rocky', 'Luna', 'Daisy', 'Coco', 'Marley', 'Max', 'Lola', 'Bella', 'Toby',
    'Charlie', 'Bailey', 'Oscar', 'Molly', 'Milo', 'Ruby', 'Cooper', 'Rosie', 'Teddy', 'Sophie',
    'Buster', 'Lucky', 'Duke', 'Penny', 'Gizmo', 'Rex', 'Ginger', 'Roxy', 'Shadow', 'Sammy',
    'Zeus', 'Stella', 'Rusty', 'Harley', 'Lulu', 'Bandit', 'Zoe', 'Jax', 'Sadie', 'Oreo',
    'Bear', 'Bentley', 'Riley', 'Chloe', 'Louie', 'Gus', 'Nala', 'Bruno', 'Winston', 'Ziggy'
  ];

  const breeds = [
    'Golden Retriever', 'German Shepherd', 'Border Collie', 'Chihuahua', 'Pug',
    'Labrador', 'French Bulldog', 'Beagle', 'Cocker Spaniel', 'Jack Russell',
    'Poodle', 'Cavalier King Charles', 'Boxer', 'Husky', 'Australian Shepherd',
    'Shiba Inu', 'Yorkshire Terrier', 'Rottweiler', 'Samoyed', 'Cane Corso',
    'Corgi', 'Dalmatian', 'Spitz Pomeranian', 'Staffordshire Bull Terrier', 'Shih Tzu'
  ];

  const interestsPool = ['hiking', 'parks', 'cafes', 'nature', 'sports', 'relaxation', 'community', 'agility', 'running', 'jogging', 'photography'];
  const walkingHabitsPool = ['morning', 'evening', 'weekend', 'daily', 'frequent'];
  const whatISeekPool = ['friend', 'mentor', 'intergenerational'];
  
  const dogPersonalitiesPool = ['playful', 'social', 'friendly', 'energetic', 'loyal', 'gentle', 'calm', 'lazy', 'shy', 'protective', 'active', 'cuddly'];

  const dogBios = [
    'Très joueur et affectueux. Adore courir après la balle !',
    'Un peu timide au début mais adorable une fois en confiance.',
    'Plein d\'énergie, cherche des copains pour se défouler au parc !',
    'Calme et obéissant. Adore les longues promenades tranquilles.',
    'Extrêmement sociable, s\'entend bien avec tous les humains et chiens !',
    'Un vrai pot de colle qui adore les câlins et faire la sieste au soleil.',
    'Passionné par le frisbee et très à l\'écoute. Toujours partant pour jouer.',
    'Curieux et joueur. Aime explorer les forêts et renifler partout.'
  ];

  const userBios = [
    'Passionné de randonnée et d\'activités en plein air avec mon toutou.',
    'Adore faire des pauses café et discuter avec d\'autres propriétaires de chiens.',
    'Cherche des compagnons de promenade réguliers pour sociabiliser nos chiens.',
    'Adepte des parcs à agility. Rocky adore courir et sauter !',
    'Retraité actif, je propose des balades calmes et conviviales en forêt.',
    'Étudiant en photographie, j\'adore capturer nos compagnons à quatre pattes.',
    'Toujours disponible pour des sorties le week-end ou en fin de journée.',
    'Nouvellement arrivé dans la région, ravi de rencontrer la communauté de dog lovers !'
  ];

  // Selected High-quality Unsplash URLs
  const dogPhotos = [
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1537151608828-ea2b117b6297?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1477884213984-b9710d2368f5?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&q=80&w=600'
  ];

  const humanPhotos = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400'
  ];

  console.log('[Seeder] Starting insertion of 50 users and dogs...');

  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    const email = `seed-${i + 1}-${Date.now().toString().slice(-4)}@example.com`;
    const openId = `seed-openid-${i + 1}-${Date.now()}`;
    const age = Math.floor(Math.random() * 55) + 18; // 18 - 72 years old

    // Randomize master properties
    const interests = JSON.stringify([
      interestsPool[Math.floor(Math.random() * interestsPool.length)],
      interestsPool[Math.floor(Math.random() * interestsPool.length)]
    ].filter((v, idx, self) => self.indexOf(v) === idx)); // unique
    
    const walkingHabits = walkingHabitsPool[Math.floor(Math.random() * walkingHabitsPool.length)];
    
    const whatISeek = JSON.stringify([
      whatISeekPool[Math.floor(Math.random() * whatISeekPool.length)]
    ]);

    const bio = userBios[Math.floor(Math.random() * userBios.length)];
    const profilePhotoUrl = humanPhotos[i % humanPhotos.length];

    // Nice center-point coordinate (43.7102, 7.2620 - Nice, France) + slight jitter
    const latitude = 43.7102 + (Math.random() - 0.5) * 0.08;
    const longitude = 7.2620 + (Math.random() - 0.5) * 0.08;

    // 1. Insert user
    const [userResult] = await connection.execute(
      `INSERT INTO users (openId, name, email, role, age, interests, walkingHabits, whatISeek, bio, profilePhotoUrl, latitude, longitude, isShareLocationActive) 
       VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [openId, fullName, email, age, interests, walkingHabits, whatISeek, bio, profilePhotoUrl, latitude, longitude]
    );

    const userId = userResult.insertId;

    // Randomize dog properties
    const dogName = dogNames[i % dogNames.length];
    const dogBreed = breeds[Math.floor(Math.random() * breeds.length)];
    const dogAge = Math.floor(Math.random() * 12) + 1; // 1 - 12 years old
    const dogBio = dogBios[Math.floor(Math.random() * dogBios.length)];
    
    const dogPersonalities = JSON.stringify([
      dogPersonalitiesPool[Math.floor(Math.random() * dogPersonalitiesPool.length)],
      dogPersonalitiesPool[Math.floor(Math.random() * dogPersonalitiesPool.length)]
    ].filter((v, idx, self) => self.indexOf(v) === idx));
    
    const dogPhotoUrls = JSON.stringify([dogPhotos[i % dogPhotos.length]]);

    // 2. Insert dog
    await connection.execute(
      `INSERT INTO dogs (userId, name, breed, age, description, personality, photoUrls)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, dogName, dogBreed, dogAge, dogBio, dogPersonalities, dogPhotoUrls]
    );
  }

  console.log('[Seeder] Successfully seeded 50 users and dogs!');
  await connection.end();
}

seed().catch(err => {
  console.error('[Seeder] Seeding failed:', err);
  process.exit(1);
});
