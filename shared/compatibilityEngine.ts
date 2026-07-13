/**
 * Moteur de scoring de compatibilité intelligent pour Compagnon
 * Analyse les traits des chiens et les affinités des maîtres
 */

export interface DogProfile {
  id?: number;
  name?: string;
  breed?: string;
  age?: number;
  personality?: string[]; // e.g., ["playful", "calm", "energetic"]
  description?: string;
}

export interface MasterProfile {
  id?: number;
  isDogSitter?: boolean;
  dogSitterBio?: string;
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
  "Golden Retriever": { "Golden Retriever": 100, "Labrador": 95, "Beagle": 85, "Poodle": 80, "Border Collie": 90 },
  "Labrador": { "Labrador": 100, "Golden Retriever": 95, "Beagle": 85, "Poodle": 80, "Border Collie": 85 },
  "Beagle": { "Beagle": 100, "Labrador": 85, "Golden Retriever": 85, "Poodle": 75 },
  "Poodle": { "Poodle": 100, "Golden Retriever": 80, "Labrador": 80, "Beagle": 75, "Border Collie": 80 },
  "Chihuahua": { "Chihuahua": 100, "Poodle": 70, "Pomeranian": 85, "Dachshund": 80 },
  "Pomeranian": { "Pomeranian": 100, "Chihuahua": 85, "Poodle": 75, "Dachshund": 80 },
  "Dachshund": { "Dachshund": 100, "Chihuahua": 80, "Pomeranian": 80, "Beagle": 85 },
  "German Shepherd": { "German Shepherd": 100, "Labrador": 80, "Golden Retriever": 75, "Boxer": 85, "Border Collie": 85 },
  "Boxer": { "Boxer": 100, "German Shepherd": 85, "Labrador": 80, "Bulldog": 75, "Border Collie": 80 },
  "Bulldog": { "Bulldog": 100, "Boxer": 75, "Pug": 85, "Beagle": 70 },
  "Pug": { "Pug": 100, "Bulldog": 85, "Chihuahua": 80, "Pomeranian": 75 },
  "Border Collie": { "Border Collie": 100, "Golden Retriever": 90, "Labrador": 85, "German Shepherd": 85, "Poodle": 80, "Boxer": 80 },
};

const SMALL_BREEDS = ["chihuahua", "pomeranian", "pug", "beagle", "dachshund", "shih tzu", "yorkshire", "jack russell", "french bulldog"];
const MEDIUM_BREEDS = ["cocker spaniel", "border collie", "shiba inu", "bulldog", "poodle", "australian shepherd"];
const LARGE_BREEDS = ["golden retriever", "labrador", "german shepherd", "boxer", "rottweiler", "great dane", "bernese mountain dog", "siberian husky"];

function getBreedSize(breed?: string): "small" | "medium" | "large" | "unknown" {
  if (!breed) return "unknown";
  const b = breed.toLowerCase().trim();
  if (SMALL_BREEDS.some(x => b.includes(x))) return "small";
  if (MEDIUM_BREEDS.some(x => b.includes(x))) return "medium";
  if (LARGE_BREEDS.some(x => b.includes(x))) return "large";
  return "unknown";
}

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
  if (age1 === undefined || age2 === undefined) return 50; // Pas d'info = score neutre

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

  if (normalizedBreed1.toLowerCase() === normalizedBreed2.toLowerCase()) return 100; // Même race = 100

  const score = BREED_COMPATIBILITY[normalizedBreed1]?.[normalizedBreed2] ?? 50;
  return score;
}

/**
 * Calcule la compatibilité globale entre deux chiens
 */
function calculateDogCompatibility(dog1: DogProfile, dog2: DogProfile): number {
  const personalityScore = calculateDogPersonalityCompatibility(dog1.personality, dog2.personality);
  const ageScore = calculateAgeCompatibility(dog1.age, dog2.age);
  
  // Breed compatibility base
  let breedScore = calculateBreedCompatibility(dog1.breed, dog2.breed);
  
  // Size adjustments
  const size1 = getBreedSize(dog1.breed);
  const size2 = getBreedSize(dog2.breed);
  
  if (size1 !== "unknown" && size2 !== "unknown") {
    if (size1 === size2) {
      breedScore = Math.min(100, breedScore + 15);
    } else if ((size1 === "small" && size2 === "large") || (size1 === "large" && size2 === "small")) {
      const dog1IsGentle = dog1.personality?.some(p => p === "gentle" || p === "friendly" || p === "social");
      const dog2IsGentle = dog2.personality?.some(p => p === "gentle" || p === "friendly" || p === "social");
      if (!dog1IsGentle && !dog2IsGentle) {
        breedScore = Math.max(20, breedScore - 15);
      }
    }
  }

  // Identical characteristics overlap count
  let characteristicsScore = 50; // base characteristics similarity
  
  // Same breed
  if (dog1.breed && dog2.breed && dog1.breed.trim().toLowerCase() === dog2.breed.trim().toLowerCase()) {
    characteristicsScore += 20;
  }
  
  // Overlapping personality traits
  if (dog1.personality && dog2.personality) {
    const common = dog1.personality.filter(p => dog2.personality?.includes(p));
    characteristicsScore += common.length * 10;
  }

  // Same age
  if (dog1.age !== undefined && dog2.age !== undefined && dog1.age === dog2.age) {
    characteristicsScore += 10;
  }

  characteristicsScore = Math.min(100, Math.max(10, characteristicsScore));

  // Pondération : personnalité (40%), race (30%), âge (15%), caractéristiques identiques (15%)
  return Math.round(personalityScore * 0.4 + breedScore * 0.3 + ageScore * 0.15 + characteristicsScore * 0.15);
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
 * Calcule la compatibilité spécifique d'un dog sitter avec le chien d'un propriétaire
 * Basé uniquement sur les mots-clés correspondants
 */
function calculateSitterDogCompatibility(
  sitterMaster: MasterProfile,
  ownerDog: DogProfile,
  ownerMaster: MasterProfile
): CompatibilityScore {
  const sitterKeywords = new Set<string>();

  // 1. Gather keywords from sitter interests
  if (sitterMaster.interests && Array.isArray(sitterMaster.interests)) {
    sitterMaster.interests.forEach(i => sitterKeywords.add(i.toLowerCase().trim()));
  }

  // 2. Gather keywords from sitter bio
  if (sitterMaster.dogSitterBio) {
    const words = sitterMaster.dogSitterBio
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .split(/\s+/);
    words.forEach(w => {
      if (w.length >= 4) sitterKeywords.add(w.trim());
    });
  }

  // 3. Gather dog characteristics
  const dogKeywords = new Set<string>();
  if (ownerDog.personality && Array.isArray(ownerDog.personality)) {
    ownerDog.personality.forEach(p => dogKeywords.add(p.toLowerCase().trim()));
  }
  if (ownerDog.breed) {
    const breedWords = ownerDog.breed.toLowerCase().split(/[\s-]+/);
    breedWords.forEach(w => {
      if (w.length >= 3) dogKeywords.add(w.trim());
    });
  }
  if (ownerDog.description) {
    const words = ownerDog.description
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .split(/\s+/);
    words.forEach(w => {
      if (w.length >= 4) dogKeywords.add(w.trim());
    });
  }

  // 4. Count matches
  let matchCount = 0;
  const matchedWords: string[] = [];
  dogKeywords.forEach(word => {
    if (sitterKeywords.has(word)) {
      matchCount++;
      matchedWords.push(word);
    }
  });

  // Base score 40, each matching keyword +15%, capped at 100%
  const overallScore = Math.min(100, 40 + matchCount * 15);

  return {
    dogCompatibility: overallScore,
    masterCompatibility: overallScore,
    overallScore,
    breakdown: {
      dogTraits: Math.min(100, matchCount * 20),
      ageAlignment: 50,
      personalityMatch: Math.min(100, matchCount * 25),
      interestAlignment: sitterMaster.interests && ownerMaster.interests 
        ? calculateInterestCompatibility(sitterMaster.interests, ownerMaster.interests)
        : 50,
      seekAlignment: 50,
    }
  };
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
  // Check if one of them is a dog sitter
  if (master1.isDogSitter) {
    return calculateSitterDogCompatibility(master1, dog2, master2);
  }
  if (master2.isDogSitter) {
    return calculateSitterDogCompatibility(master2, dog1, master1);
  }

  // Normal dog-to-dog & master-to-master match
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

const FRENCH_TRAITS: Record<string, string> = {
  playful: "joueur",
  energetic: "énergique",
  calm: "calme",
  lazy: "pantouflard",
  social: "sociable",
  friendly: "amical",
  gentle: "doux",
  shy: "timide",
  aggressive: "dominant",
  protective: "protecteur",
  loyal: "loyal",
};

const FRENCH_INTERESTS: Record<string, string> = {
  hiking: "Randonnée",
  nature: "Nature",
  outdoor: "Plein air",
  parks: "Parcs",
  social: "Rencontres",
  cafes: "Cafés",
  relaxation: "Détente",
  reading: "Lecture",
  sports: "Sports",
  fitness: "Fitness",
  community: "Communauté",
  events: "Événements",
};

export function getAffinities(
  dog1: DogProfile,
  master1: MasterProfile,
  dog2: DogProfile,
  master2: MasterProfile
): string[] {
  const affinities: string[] = [];

  // Check if it is a dog-sitter match
  const isSitterMatch = master1.isDogSitter || master2.isDogSitter;
  if (isSitterMatch) {
    const sitter = master1.isDogSitter ? master1 : master2;
    const dog = master1.isDogSitter ? dog2 : dog1;
    const sitterMasterObj = master1.isDogSitter ? master1 : master2;
    const ownerMasterObj = master1.isDogSitter ? master2 : master1;

    // Extract keywords from sitter
    const sitterKeywords = new Set<string>();
    if (sitter.interests && Array.isArray(sitter.interests)) {
      sitter.interests.forEach(i => sitterKeywords.add(i.toLowerCase().trim()));
    }
    if (sitter.dogSitterBio) {
      sitter.dogSitterBio.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").split(/\s+/).forEach(w => {
        if (w.length >= 4) sitterKeywords.add(w.trim());
      });
    }

    // Extract keywords from dog
    const dogKeywords = new Set<string>();
    if (dog.personality && Array.isArray(dog.personality)) {
      dog.personality.forEach(p => dogKeywords.add(p.toLowerCase().trim()));
    }
    if (dog.breed) {
      dog.breed.toLowerCase().split(/[\s-]+/).forEach(w => {
        if (w.length >= 3) dogKeywords.add(w.trim());
      });
    }
    if (dog.description) {
      dog.description.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").split(/\s+/).forEach(w => {
        if (w.length >= 4) dogKeywords.add(w.trim());
      });
    }

    // Find intersection
    const matched: string[] = [];
    dogKeywords.forEach(w => {
      if (sitterKeywords.has(w)) {
        matched.push(w);
      }
    });

    matched.slice(0, 3).forEach(word => {
      const frenchWord = FRENCH_TRAITS[word] || FRENCH_INTERESTS[word] || word;
      affinities.push(`✨ Profil : ${frenchWord}`);
    });

    if (affinities.length === 0) {
      affinities.push("🏡 Prêt pour garde de confiance");
    }
    return affinities;
  }

  // 1. Breed
  if (dog1.breed && dog2.breed) {
    if (dog1.breed.trim().toLowerCase() === dog2.breed.trim().toLowerCase()) {
      affinities.push(`⭐ Même race (${dog1.breed})`);
    } else {
      const score = calculateBreedCompatibility(dog1.breed, dog2.breed);
      if (score >= 80) {
        affinities.push(`⭐ Races complices (${dog1.breed} & ${dog2.breed})`);
      }
    }
  }

  // 2. Personality
  if (dog1.personality && dog2.personality) {
    const commonTraits = dog1.personality.filter(trait => dog2.personality?.includes(trait));
    commonTraits.forEach(trait => {
      const label = FRENCH_TRAITS[trait] || trait;
      if (trait === "playful" || trait === "social" || trait === "friendly") {
        affinities.push(`⚽ Très ${label}`);
      } else if (trait === "calm" || trait === "gentle" || trait === "lazy") {
        affinities.push(`💤 Calme & ${label}`);
      } else {
        affinities.push(`🐾 ${label}`);
      }
    });
  }

  // 3. Age Closeness
  if (dog1.age !== undefined && dog2.age !== undefined) {
    if (dog1.age === dog2.age) {
      affinities.push(`🎂 Même âge (${dog1.age} ans)`);
    } else if (Math.abs(dog1.age - dog2.age) === 1) {
      affinities.push(`🎂 Âges proches (${dog1.age} & ${dog2.age} ans)`);
    }
  }

  // 4. Master Interests
  if (master1.interests && master2.interests) {
    const commonInterests = master1.interests.filter(interest => master2.interests?.includes(interest));
    commonInterests.slice(0, 2).forEach(interest => {
      const label = FRENCH_INTERESTS[interest] || interest;
      affinities.push(`🌳 Adore : ${label}`);
    });
  }

  // 5. Walking Habits
  if (master1.walkingHabits && master2.walkingHabits) {
    const commonHabits = master1.walkingHabits.filter(habit => master2.walkingHabits?.includes(habit));
    if (commonHabits.length > 0) {
      const habit = commonHabits[0];
      if (habit === "morning") affinities.push("🌅 Balade le matin");
      else if (habit === "evening") affinities.push("% Balade le soir");
      else if (habit === "weekend") affinities.push("🗓️ Balade week-end");
      else if (habit === "frequent" || habit === "daily") affinities.push("🔄 Balades régulières");
    }
  }

  return affinities.slice(0, 3); // Return up to 3 strong highlights
}
