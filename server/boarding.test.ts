/**
 * Tests unitaires — Système de Gardiennage (Boarding)
 *
 * Couvre :
 * 1. Validation des formulaires dog-sitter
 * 2. Logique de statut des demandes de garde
 * 3. Calcul et affichage des tarifs
 * 4. Toggles de disponibilité
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── 1. Validation formulaire d'inscription sitter ──────────────────────────

describe("DogSitterDashboard - Form validation", () => {
  function validateSitterForm(form: {
    dogSitterBio: string;
    dogSitterRates: { night: number; halfDay: number; walk: number };
    dogSitterMaxDogs: number;
  }) {
    const errors: string[] = [];

    if (!form.dogSitterBio.trim()) {
      errors.push("Bio requise");
    }
    if (form.dogSitterBio.length > 800) {
      errors.push("Bio trop longue (max 800 chars)");
    }
    if (form.dogSitterMaxDogs < 1 || form.dogSitterMaxDogs > 10) {
      errors.push("Capacité invalide (1-10)");
    }
    const rateValues = Object.values(form.dogSitterRates);
    if (rateValues.some((v) => v < 0)) {
      errors.push("Les tarifs ne peuvent pas être négatifs");
    }
    if (form.dogSitterRates.night > 500 || form.dogSitterRates.halfDay > 500) {
      errors.push("Tarif nuit/demi-journée trop élevé (max 500€)");
    }
    if (form.dogSitterRates.walk > 200) {
      errors.push("Tarif promenade trop élevé (max 200€)");
    }

    return errors;
  }

  it("accepte un formulaire valide", () => {
    const errors = validateSitterForm({
      dogSitterBio: "Passionné des chiens depuis 10 ans.",
      dogSitterRates: { night: 30, halfDay: 15, walk: 10 },
      dogSitterMaxDogs: 2,
    });
    expect(errors).toHaveLength(0);
  });

  it("rejette si bio vide", () => {
    const errors = validateSitterForm({
      dogSitterBio: "",
      dogSitterRates: { night: 20, halfDay: 10, walk: 8 },
      dogSitterMaxDogs: 1,
    });
    expect(errors).toContain("Bio requise");
  });

  it("rejette si bio > 800 chars", () => {
    const errors = validateSitterForm({
      dogSitterBio: "a".repeat(801),
      dogSitterRates: { night: 20, halfDay: 10, walk: 8 },
      dogSitterMaxDogs: 1,
    });
    expect(errors).toContain("Bio trop longue (max 800 chars)");
  });

  it("rejette capacité max = 0", () => {
    const errors = validateSitterForm({
      dogSitterBio: "Bio valide",
      dogSitterRates: { night: 20, halfDay: 10, walk: 8 },
      dogSitterMaxDogs: 0,
    });
    expect(errors).toContain("Capacité invalide (1-10)");
  });

  it("rejette capacité max = 11", () => {
    const errors = validateSitterForm({
      dogSitterBio: "Bio valide",
      dogSitterRates: { night: 20, halfDay: 10, walk: 8 },
      dogSitterMaxDogs: 11,
    });
    expect(errors).toContain("Capacité invalide (1-10)");
  });

  it("rejette tarifs négatifs", () => {
    const errors = validateSitterForm({
      dogSitterBio: "Bio valide",
      dogSitterRates: { night: -5, halfDay: 10, walk: 8 },
      dogSitterMaxDogs: 2,
    });
    expect(errors).toContain("Les tarifs ne peuvent pas être négatifs");
  });

  it("rejette tarif nuit > 500€", () => {
    const errors = validateSitterForm({
      dogSitterBio: "Bio valide",
      dogSitterRates: { night: 600, halfDay: 10, walk: 8 },
      dogSitterMaxDogs: 2,
    });
    expect(errors).toContain("Tarif nuit/demi-journée trop élevé (max 500€)");
  });

  it("rejette tarif promenade > 200€", () => {
    const errors = validateSitterForm({
      dogSitterBio: "Bio valide",
      dogSitterRates: { night: 30, halfDay: 15, walk: 250 },
      dogSitterMaxDogs: 2,
    });
    expect(errors).toContain("Tarif promenade trop élevé (max 200€)");
  });
});

// ─── 2. Logique de statut des demandes de garde ──────────────────────────────

describe("BoardingRequest - Status transitions", () => {
  type Status = "pending" | "accepted" | "rejected" | "completed";

  function canTransitionTo(from: Status, to: Status): boolean {
    const allowed: Record<Status, Status[]> = {
      pending:   ["accepted", "rejected"],
      accepted:  ["completed"],
      rejected:  [],
      completed: [],
    };
    return allowed[from].includes(to);
  }

  it("pending → accepted : autorisé", () => {
    expect(canTransitionTo("pending", "accepted")).toBe(true);
  });

  it("pending → rejected : autorisé", () => {
    expect(canTransitionTo("pending", "rejected")).toBe(true);
  });

  it("accepted → completed : autorisé", () => {
    expect(canTransitionTo("accepted", "completed")).toBe(true);
  });

  it("rejected → accepted : interdit", () => {
    expect(canTransitionTo("rejected", "accepted")).toBe(false);
  });

  it("completed → pending : interdit", () => {
    expect(canTransitionTo("completed", "pending")).toBe(false);
  });

  it("pending → completed : interdit (doit passer par accepted)", () => {
    expect(canTransitionTo("pending", "completed")).toBe(false);
  });
});

// ─── 3. Affichage des tarifs ─────────────────────────────────────────────────

describe("BoardingRates - Display helpers", () => {
  function formatRate(value: number, type: "night" | "halfDay" | "walk"): string {
    if (!value || value <= 0) return "";
    const labels = { night: "/nuit", halfDay: "/demi-j.", walk: "/promenade" };
    return `${value}€${labels[type]}`;
  }

  it("formate correctement un tarif nuit", () => {
    expect(formatRate(30, "night")).toBe("30€/nuit");
  });

  it("formate correctement un tarif demi-journée", () => {
    expect(formatRate(15, "halfDay")).toBe("15€/demi-j.");
  });

  it("formate correctement un tarif promenade", () => {
    expect(formatRate(12, "walk")).toBe("12€/promenade");
  });

  it("retourne vide pour tarif à 0", () => {
    expect(formatRate(0, "night")).toBe("");
  });

  it("retourne vide pour tarif négatif", () => {
    expect(formatRate(-1, "walk")).toBe("");
  });
});

// ─── 4. Disponibilité sitter ─────────────────────────────────────────────────

describe("DogSitter - Availability logic", () => {
  function isSitterAvailableForDog(sitter: {
    dogSitterAvailable: boolean;
    dogSitterStatus: string;
    dogSitterMaxDogs: number;
    currentlyHostedCount: number;
  }): { available: boolean; reason?: string } {
    if (sitter.dogSitterStatus !== "approved") {
      return { available: false, reason: "Profil non approuvé" };
    }
    if (!sitter.dogSitterAvailable) {
      return { available: false, reason: "Sitter indisponible" };
    }
    if (sitter.currentlyHostedCount >= sitter.dogSitterMaxDogs) {
      return { available: false, reason: "Capacité maximale atteinte" };
    }
    return { available: true };
  }

  it("sitter approuvé et disponible avec capacité libre = disponible", () => {
    const result = isSitterAvailableForDog({
      dogSitterAvailable: true,
      dogSitterStatus: "approved",
      dogSitterMaxDogs: 3,
      currentlyHostedCount: 1,
    });
    expect(result.available).toBe(true);
  });

  it("sitter en attente = non disponible", () => {
    const result = isSitterAvailableForDog({
      dogSitterAvailable: true,
      dogSitterStatus: "pending",
      dogSitterMaxDogs: 3,
      currentlyHostedCount: 0,
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Profil non approuvé");
  });

  it("sitter approuvé mais toggle off = non disponible", () => {
    const result = isSitterAvailableForDog({
      dogSitterAvailable: false,
      dogSitterStatus: "approved",
      dogSitterMaxDogs: 3,
      currentlyHostedCount: 0,
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Sitter indisponible");
  });

  it("capacité maximale atteinte = non disponible", () => {
    const result = isSitterAvailableForDog({
      dogSitterAvailable: true,
      dogSitterStatus: "approved",
      dogSitterMaxDogs: 2,
      currentlyHostedCount: 2,
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Capacité maximale atteinte");
  });
});
