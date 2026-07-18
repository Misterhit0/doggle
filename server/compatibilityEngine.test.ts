import { describe, expect, it } from "vitest";
import { 
  calculateCompatibility, 
  getAffinities, 
  DogProfile, 
  MasterProfile 
} from "../shared/compatibilityEngine";

describe("Smart Compatibility Engine Tests", () => {
  
  describe("Dog-to-Dog Matching (B2C)", () => {
    
    it("computes high score for matching breed and overlapping personalities", () => {
      const dog1: DogProfile = {
        breed: "Golden Retriever",
        age: 3,
        personality: ["playful", "social", "friendly"]
      };
      const master1: MasterProfile = {
        interests: ["hiking", "parks"],
        walkingHabits: ["morning"],
        whatISeek: ["friend"]
      };

      const dog2: DogProfile = {
        breed: "Golden Retriever",
        age: 3,
        personality: ["playful", "social", "friendly"]
      };
      const master2: MasterProfile = {
        interests: ["hiking", "parks"],
        walkingHabits: ["morning"],
        whatISeek: ["friend"]
      };

      const score = calculateCompatibility(dog1, master1, dog2, master2);
      
      // Expected compatibility should be very high (ideal match)
      expect(score.overallScore).toBeGreaterThanOrEqual(85);
      expect(score.dogCompatibility).toBeGreaterThanOrEqual(90);
      expect(score.breakdown.dogTraits).toBeGreaterThanOrEqual(80);
      expect(score.breakdown.ageAlignment).toBeGreaterThanOrEqual(90);
    });

    it("applies a size penalty for large vs small breeds with non-gentle personalities", () => {
      const dog1: DogProfile = {
        breed: "Chihuahua", // Small size group
        age: 2,
        personality: ["aggressive", "shy"]
      };
      const master1: MasterProfile = {
        interests: ["reading"]
      };

      const dog2: DogProfile = {
        breed: "Rottweiler", // Large size group
        age: 5,
        personality: ["aggressive", "protective"]
      };
      const master2: MasterProfile = {
        interests: ["hiking"]
      };

      const score = calculateCompatibility(dog1, master1, dog2, master2);

      // Large vs Small breed penalty should keep the score relatively low
      expect(score.dogCompatibility).toBeLessThanOrEqual(60);
    });

    it("bypasses the size penalty if one of the dogs has a gentle/friendly personality", () => {
      const dog1: DogProfile = {
        breed: "Chihuahua",
        age: 2,
        personality: ["friendly", "social"]
      };
      const master1: MasterProfile = {};

      const dog2: DogProfile = {
        breed: "Golden Retriever", // Large size group
        age: 2,
        personality: ["gentle", "calm"]
      };
      const master2: MasterProfile = {};

      const score = calculateCompatibility(dog1, master1, dog2, master2);

      // With friendly/gentle traits, the score is higher than the aggressive pair
      expect(score.dogCompatibility).toBeGreaterThanOrEqual(65);
    });
  });

  describe("Dog Sitter Keyword Matching (B2B)", () => {
    
    it("computes matching score based on bio keywords and dog personality/description", () => {
      const sitterMaster: MasterProfile = {
        isDogSitter: true,
        dogSitterBio: "We love energetic and playful dogs! We take them hiking and play in nature.",
        interests: ["hiking", "parks"]
      };
      const sitterDog: DogProfile = {}; // Sitter doesn't necessarily have a dog

      const ownerDog: DogProfile = {
        breed: "Labrador",
        age: 2,
        personality: ["playful", "energetic"],
        description: "This dog loves hiking in nature and playing with balls."
      };
      const ownerMaster: MasterProfile = {
        interests: ["hiking"]
      };

      const score = calculateCompatibility(sitterDog, sitterMaster, ownerDog, ownerMaster);
      
      // Should have high compatibility due to many keyword overlaps:
      // "playful", "energetic", "hiking", "nature"
      expect(score.overallScore).toBeGreaterThanOrEqual(80);
      expect(score.dogCompatibility).toBeGreaterThanOrEqual(80);
      expect(score.breakdown.personalityMatch).toBeGreaterThan(50);
    });

    it("gives a base score of 40 even with zero keyword overlaps", () => {
      const sitterMaster: MasterProfile = {
        isDogSitter: true,
        dogSitterBio: "Quiet apartment sitting.",
        interests: ["reading"]
      };
      const sitterDog: DogProfile = {};

      const ownerDog: DogProfile = {
        breed: "German Shepherd",
        age: 4,
        personality: ["aggressive"],
        description: "Requires structured exercises."
      };
      const ownerMaster: MasterProfile = {};

      const score = calculateCompatibility(sitterDog, sitterMaster, ownerDog, ownerMaster);
      
      // Base score should be 40
      expect(score.overallScore).toBe(40);
    });
  });

  describe("Affinities Highlighting", () => {
    
    it("returns mutual affinities for standard dog matches", () => {
      const dog1: DogProfile = {
        breed: "Beagle",
        age: 4,
        personality: ["playful"]
      };
      const master1: MasterProfile = {
        interests: ["hiking"],
        walkingHabits: ["morning"]
      };

      const dog2: DogProfile = {
        breed: "Beagle",
        age: 4,
        personality: ["playful"]
      };
      const master2: MasterProfile = {
        interests: ["hiking"],
        walkingHabits: ["morning"]
      };

      const affinities = getAffinities(dog1, master1, dog2, master2);
      expect(affinities).toContain("⭐ Même race (Beagle)");
      expect(affinities).toContain("⚽ Très joueur");
      expect(affinities).toContain("🎂 Même âge (4 ans)");
    });

    it("returns sitter-specific keyword affinities when matching a dog sitter", () => {
      const sitterMaster: MasterProfile = {
        isDogSitter: true,
        dogSitterBio: "Passionate about playful and gentle dogs.",
        interests: ["hiking"]
      };
      const sitterDog: DogProfile = {};

      const ownerDog: DogProfile = {
        breed: "Golden Retriever",
        personality: ["playful", "gentle"]
      };
      const ownerMaster: MasterProfile = {};

      const affinities = getAffinities(sitterDog, sitterMaster, ownerDog, ownerMaster);
      
      // Sitter match affinities should show matched traits or interests
      expect(affinities.some(a => a.includes("Profil"))).toBe(true);
    });
  });
});
