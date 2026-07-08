/**
 * Moteur de scoring de compatibilité intelligent pour Compagnon
 * Analyse les traits des chiens et les affinités des maîtres
 */

export interface DogProfile {
  breed?: string;
  age?: number;
  personality?: string[]; // e.g., ["playful", "calm", "energetic"]
}

export interface MasterProfile {
  age?: number;
  interests?: string[]; // e.g., ["hiking", "parks", "social"]
  walkingHabits?: string[]; // e.g., ["morning", "evening", "frequent"]
  whatISeek?: string[]; // e.g., ["friend", "mentor", "intergenerational"]
}

export interface CompatibilityScore {
  dogCompatibility: number; // 0-100
  masterCompatibility: number; // 0-100
  overallScore: number; // 0-100
  breakdown: {
    dogTraits: number;
    ageAlignment: number;
    personalityMatch: number;
    interestAlignment: number;
    seekAlignment: number;
  };
}

/**
 * Matrice de compatibilité entre traits de personnalité
 * Plus la valeur est élevée, plus les traits sont compatibles
 */
const PERSONALITY_COMPATIBILITY: Record<string, Record<string, number>> = {
  playful: { playful: 100, energetic: 90, social: 85, calm: 30, lazy: 10 },
  energetic: { energetic: 100, playful: 90, social: 80, calm: 40, lazy: 15 },
  calm: { calm: 100, lazy: 80, gentle: 90, playful: 30, energetic: 40 },
  lazy: { lazy: 100, calm: 90, gentle: 85, playful: 10, energetic: 15 },
  social: { social: 100, playful: 85, energetic: 80, friendly: 95, shy: 20 },
  friendly: { friendly: 100, social: 95, gentle: 90, calm: 85, shy: 30 },
  gentle: { gentle: 100, calm: 90, friendly: 90, lazy: 85, aggressive: 5 },
  shy: { shy: 100, calm: 80, gentle: 85, social: 20, playful: 25 },
  aggressive: { aggressive: 100, protective: 80, gentle: 5, calm: 10 },
  protective: { protective: 100, aggressive: 80, loyal: 95, social: 60 },
  loyal: { loyal: 100, protective: 95, friendly: 90, calm: 85 },
};

/**
 * Matrice de compatibilité entre races (simplifié)
 * Certaines races s'entendent mieux ensemble
 */
const BREED_COMPATIBILITY: Record<string, Record<string, number>> = {
  "Golden Retriever": { "Golden Retriever": 100, "Labrador": 95, "Beagle": 85, "Poodle": 80 },
  "Labrador": { "Labrador": 100, "Golden Retriever": 95, "Beagle": 85, "Poodle": 80 },
  "Beagle": { "Beagle": 100, "Labrador": 85, "Golden Retriever": 85, "Poodle": 75 },
  "Poodle": { "Poodle": 100, "Golden Retriever": 80, "Labrador": 80, "Beagle": 75 },
  "Chihuahua": { "Chihuahua": 100, "Poodle": 70, "Pomeranian": 85, "Dachshund": 80 },
  "Pomeranian": { "Pomeranian": 100, "Chihuahua": 85, "Poodle": 75, "Dachshund": 80 },
  "Dachshund": { "Dachshund": 100, "Chihuahua": 80, "Pomeranian": 80, "Beagle": 85 },
  "German Shepherd": { "German Shepherd": 100, "Labrador": 80, "Golden Retriever": 75, "Boxer": 85 },
  "Boxer": { "Boxer": 100, "German Shepherd": 85, "Labrador": 80, "Bulldog": 75 },
  "Bulldog": { "Bulldog": 100, "Boxer": 75, "Pug": 85, "Beagle": 70 },
  "Pug": { "Pug": 100, "Bulldog": 85, "Chihuahua": 80, "Pomeranian": 75 },
};

/**
 * Matrice de compatibilité entre intérêts
 */
const INTEREST_COMPATIBILITY: Record<string, Record<string, number>> = {
  hiking: { hiking: 100, nature: 95, outdoor: 90, parks: 85, sports: 80 },
  nature: { nature: 100, hiking: 95, outdoor: 90, parks: 85, photography: 75 },
  outdoor: { outdoor: 100, hiking: 90, nature: 90, parks: 85, sports: 80 },
  parks: { parks: 100, outdoor: 85, nature: 85, social: 80, relaxation: 75 },
  social: { social: 100, parks: 80, cafes: 90, events: 85, community: 80 },
  cafes: { cafes: 100, social: 90, relaxation: 85, reading: 80, community: 75 },
  relaxation: { relaxation: 100, cafes: 85, parks: 75, reading: 85, calm: 80 },
  reading: { reading: 100, relaxation: 85, quiet: 90, cafes: 80, nature: 70 },
  sports: { sports: 100, hiking: 80, outdoor: 80, energetic: 85, fitness: 90 },
  fitness: { fitness: 100, sports: 90, energetic: 85, outdoor: 75, hiking: 80 },
  community: { community: 100, social: 80, events: 90, parks: 75, volunteering: 85 },
  events: { events: 100, community: 90, social: 85, cafes: 75, networking: 80 },
};

/**
 * Matrice de compatibilité entre habitudes de balade
 */
const WALKING_HABITS_COMPATIBILITY: Record<string, Record<string, number>> = {
  morning: { morning: 100, early: 95, frequent: 80, daily: 85 },
  evening: { evening: 100, late: 95, frequent: 80, daily: 85 },
  early: { early: 100, morning: 95, frequent: 75, daily: 80 },
  late: { late: 100, evening: 95, frequent: 75, daily: 80 },
  frequent: { frequent: 100, daily: 95, morning: 80, evening: 80 },
  daily: { daily: 100, frequent: 95, morning: 85, evening: 85 },
  weekend: { weekend: 100, occasional: 85, relaxed: 80, social: 75 },
  occasional: { occasional: 100, weekend: 85, relaxed: 85, casual: 80 },
  relaxed: { relaxed: 100, occasional: 85, weekend: 80, casual: 85 },
  casual: { casual: 100, relaxed: 85, occasional: 80, weekend: 75 },
};

/**
 * Calcule la différence d'âge et retourne un score de compatibilité
 * Les chiens du même âge ou proches en âge sont plus compatibles
 */
function calculateAgeCompatibility(age1?: number, age2?: number): number {
  if (!age1 || !age2) return 50; // Pas d'info = score neutre

  const ageDiff = Math.abs(age1 - age2);

  // Même âge = 100
  if (ageDiff === 0) return 100;
  // Différence de 1 an = 90
  if (ageDiff === 1) return 90;
  // Différence de 2 ans = 80
  if (ageDiff === 2) return 80;
  // Différence de 3 ans = 70
  if (ageDiff === 3) return 70;
  // Différence de 4-5 ans = 60
  if (ageDiff <= 5) return 60;
  // Différence de 6-10 ans = 40
  if (ageDiff <= 10) return 40;
  // Plus de 10 ans = 20
  return 20;
}

/**
 * Calcule la compatibilité entre deux listes de traits
 */
function calculateTraitCompatibility(
  traits1: string[] | undefined,
  traits2: string[] | undefined,
  compatibilityMatrix: Record<string, Record<string, number>>
): number {
  if (!traits1 || !traits2 || traits1.length === 0 || traits2.length === 0) {
    return 50; // Pas d'info = score neutre
  }

  let totalScore = 0;
  let comparisons = 0;

  for (const trait1 of traits1) {
    for (const trait2 of traits2) {
      const score = compatibilityMatrix[trait1]?.[trait2] ?? 50;
      totalScore += score;
      comparisons++;
    }
  }

  return comparisons > 0 ? Math.round(totalScore / comparisons) : 50;
}

/**
 * Calcule la compatibilité entre les traits de personnalité des chiens
 */
function calculateDogPersonalityCompatibility(
  personality1: string[] | undefined,
  personality2: string[] | undefined
): number {
  return calculateTraitCompatibility(personality1, personality2, PERSONALITY_COMPATIBILITY);
}

/**
 * Calcule la compatibilité entre les races des chiens
 */
function calculateBreedCompatibility(breed1?: string, breed2?: string): number {
  if (!breed1 || !breed2) return 50; // Pas d'info = score neutre

  const normalizedBreed1 = breed1.trim();
  const normalizedBreed2 = breed2.trim();

  if (normalizedBreed1 === normalizedBreed2) return 100; // Même race = 100

  const score = BREED_COMPATIBILITY[normalizedBreed1]?.[normalizedBreed2] ?? 50;
  return score;
}

/**
 * Calcule la compatibilité globale entre deux chiens
 */
function calculateDogCompatibility(dog1: DogProfile, dog2: DogProfile): number {
  const personalityScore = calculateDogPersonalityCompatibility(dog1.personality, dog2.personality);
  const ageScore = calculateAgeCompatibility(dog1.age, dog2.age);
  const breedScore = calculateBreedCompatibility(dog1.breed, dog2.breed);

  // Pondération : personnalité (50%), âge (30%), race (20%)
  return Math.round(personalityScore * 0.5 + ageScore * 0.3 + breedScore * 0.2);
}

/**
 * Calcule la compatibilité entre les intérêts des maîtres
 */
function calculateInterestCompatibility(
  interests1: string[] | undefined,
  interests2: string[] | undefined
): number {
  return calculateTraitCompatibility(interests1, interests2, INTEREST_COMPATIBILITY);
}

/**
 * Calcule la compatibilité entre les habitudes de balade
 */
function calculateWalkingHabitsCompatibility(
  habits1: string[] | undefined,
  habits2: string[] | undefined
): number {
  return calculateTraitCompatibility(habits1, habits2, WALKING_HABITS_COMPATIBILITY);
}

/**
 * Calcule la compatibilité entre ce que les maîtres cherchent
 * (ami, mentor, échange intergénérationnel)
 */
function calculateSeekCompatibility(seek1: string[] | undefined, seek2: string[] | undefined): number {
  if (!seek1 || !seek2 || seek1.length === 0 || seek2.length === 0) {
    return 50; // Pas d'info = score neutre
  }

  // Vérifier s'il y a des objectifs communs
  const commonGoals = seek1.filter(goal => seek2.includes(goal));
  if (commonGoals.length > 0) {
    return 90; // Objectifs communs = très compatible
  }

  // Vérifier la complémentarité (ex: mentor + friend)
  const complementaryPairs: [string, string][] = [
    ["mentor", "friend"],
    ["friend", "mentor"],
    ["intergenerational", "friend"],
    ["friend", "intergenerational"],
    ["intergenerational", "mentor"],
    ["mentor", "intergenerational"],
  ];

  for (const [goal1, goal2] of complementaryPairs) {
    if (seek1.includes(goal1) && seek2.includes(goal2)) {
      return 75; // Objectifs complémentaires = compatible
    }
  }

  return 40; // Objectifs différents = moins compatible
}

/**
 * Calcule la compatibilité entre deux maîtres
 */
function calculateMasterCompatibility(master1: MasterProfile, master2: MasterProfile): number {
  const interestScore = calculateInterestCompatibility(master1.interests, master2.interests);
  const habitsScore = calculateWalkingHabitsCompatibility(master1.walkingHabits, master2.walkingHabits);
  const seekScore = calculateSeekCompatibility(master1.whatISeek, master2.whatISeek);

  // Pondération : intérêts (40%), habitudes (35%), objectifs (25%)
  return Math.round(interestScore * 0.4 + habitsScore * 0.35 + seekScore * 0.25);
}

/**
 * Calcule le score de compatibilité global entre deux duos (chien + maître)
 */
export function calculateCompatibility(
  dog1: DogProfile,
  master1: MasterProfile,
  dog2: DogProfile,
  master2: MasterProfile
): CompatibilityScore {
  const dogCompatibility = calculateDogCompatibility(dog1, dog2);
  const masterCompatibility = calculateMasterCompatibility(master1, master2);

  // Score global : 60% chiens, 40% maîtres
  // Les chiens sont prioritaires car c'est le cœur du matching
  const overallScore = Math.round(dogCompatibility * 0.6 + masterCompatibility * 0.4);

  return {
    dogCompatibility,
    masterCompatibility,
    overallScore,
    breakdown: {
      dogTraits: calculateDogPersonalityCompatibility(dog1.personality, dog2.personality),
      ageAlignment: calculateAgeCompatibility(dog1.age, dog2.age),
      personalityMatch: calculateDogPersonalityCompatibility(dog1.personality, dog2.personality),
      interestAlignment: calculateInterestCompatibility(master1.interests, master2.interests),
      seekAlignment: calculateSeekCompatibility(master1.whatISeek, master2.whatISeek),
    },
  };
}

/**
 * Formate le score de compatibilité pour l'affichage
 */
export function formatCompatibilityScore(score: number): string {
  if (score >= 85) return "Excellent match 🔥";
  if (score >= 70) return "Bon match 👍";
  if (score >= 50) return "Compatible 💙";
  if (score >= 30) return "Peut-être 🤔";
  return "Peu compatible 😕";
}

/**
 * Retourne une couleur basée sur le score
 */
export function getCompatibilityColor(score: number): string {
  if (score >= 85) return "from-red-500 to-orange-500"; // 🔥
  if (score >= 70) return "from-green-500 to-emerald-500"; // 👍
  if (score >= 50) return "from-blue-500 to-cyan-500"; // 💙
  if (score >= 30) return "from-yellow-500 to-amber-500"; // 🤔
  return "from-gray-500 to-slate-500"; // 😕
}
