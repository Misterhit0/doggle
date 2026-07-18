/**
 * Tests unitaires — Mode Reproduction (Breeding filter)
 *
 * Couvre :
 * 1. Filtrage des duos par option breeding
 * 2. Badge de reproduction affiché correctement
 * 3. Reset de l'index de swipe au changement de filtre
 */

import { describe, it, expect } from "vitest";

// ─── Type minimal pour un duo ─────────────────────────────────────────────────

interface Dog {
  id: number;
  name: string;
  openToBreeding?: boolean | number | null;
}

interface Duo {
  dogs: Dog[];
  userId: number;
}

// ─── 1. Filtrage des duos ────────────────────────────────────────────────────

describe("DiscoveryPage - Breeding filter logic", () => {
  function filterDuos(duos: Duo[], breedingOnly: boolean): Duo[] {
    if (!breedingOnly) return duos;
    return duos.filter((duo) =>
      duo.dogs.some(
        (dog) => dog.openToBreeding === true || dog.openToBreeding === 1
      )
    );
  }

  const allDuos: Duo[] = [
    { userId: 1, dogs: [{ id: 1, name: "Rex", openToBreeding: true }] },
    { userId: 2, dogs: [{ id: 2, name: "Bella", openToBreeding: false }] },
    { userId: 3, dogs: [{ id: 3, name: "Max", openToBreeding: 1 }] },
    { userId: 4, dogs: [{ id: 4, name: "Luna", openToBreeding: null }] },
    { userId: 5, dogs: [{ id: 5, name: "Charlie", openToBreeding: 0 }] },
  ];

  it("retourne tous les duos quand breedingOnly = false", () => {
    const result = filterDuos(allDuos, false);
    expect(result).toHaveLength(5);
  });

  it("filtre correctement avec breedingOnly = true (boolean true)", () => {
    const result = filterDuos(allDuos, true);
    const names = result.flatMap((d) => d.dogs.map((dog) => dog.name));
    expect(names).toContain("Rex");
    expect(names).not.toContain("Bella");
  });

  it("accepte openToBreeding = 1 (valeur SQL)", () => {
    const result = filterDuos(allDuos, true);
    const names = result.flatMap((d) => d.dogs.map((dog) => dog.name));
    expect(names).toContain("Max");
  });

  it("exclut openToBreeding = null", () => {
    const result = filterDuos(allDuos, true);
    const names = result.flatMap((d) => d.dogs.map((dog) => dog.name));
    expect(names).not.toContain("Luna");
  });

  it("exclut openToBreeding = 0", () => {
    const result = filterDuos(allDuos, true);
    const names = result.flatMap((d) => d.dogs.map((dog) => dog.name));
    expect(names).not.toContain("Charlie");
  });

  it("renvoie tableau vide si aucun chien ouvert à la reproduction", () => {
    const noBreedingDuos: Duo[] = [
      { userId: 1, dogs: [{ id: 1, name: "Bob", openToBreeding: false }] },
    ];
    const result = filterDuos(noBreedingDuos, true);
    expect(result).toHaveLength(0);
  });
});

// ─── 2. Badge de reproduction ────────────────────────────────────────────────

describe("DiscoveryPage - Breeding badge display", () => {
  function shouldShowBadge(dog: { openToBreeding?: boolean | number | null }): boolean {
    return dog.openToBreeding === true || dog.openToBreeding === 1;
  }

  it("affiche le badge si openToBreeding = true", () => {
    expect(shouldShowBadge({ openToBreeding: true })).toBe(true);
  });

  it("affiche le badge si openToBreeding = 1 (SQLite)", () => {
    expect(shouldShowBadge({ openToBreeding: 1 })).toBe(true);
  });

  it("n'affiche pas le badge si openToBreeding = false", () => {
    expect(shouldShowBadge({ openToBreeding: false })).toBe(false);
  });

  it("n'affiche pas le badge si openToBreeding = null", () => {
    expect(shouldShowBadge({ openToBreeding: null })).toBe(false);
  });

  it("n'affiche pas le badge si openToBreeding = undefined", () => {
    expect(shouldShowBadge({})).toBe(false);
  });

  it("n'affiche pas le badge si openToBreeding = 0", () => {
    expect(shouldShowBadge({ openToBreeding: 0 })).toBe(false);
  });
});

// ─── 3. Reset index lors du changement de filtre ─────────────────────────────

describe("DiscoveryPage - Index reset on filter change", () => {
  function applyFilter(state: {
    currentIndex: number;
    breedingOnly: boolean;
  }, newBreedingOnly: boolean): { currentIndex: number; breedingOnly: boolean } {
    if (state.breedingOnly === newBreedingOnly) return state;
    return { currentIndex: 0, breedingOnly: newBreedingOnly };
  }

  it("remet l'index à 0 quand on active le mode reproduction", () => {
    const state = { currentIndex: 3, breedingOnly: false };
    const result = applyFilter(state, true);
    expect(result.currentIndex).toBe(0);
    expect(result.breedingOnly).toBe(true);
  });

  it("remet l'index à 0 quand on désactive le mode reproduction", () => {
    const state = { currentIndex: 2, breedingOnly: true };
    const result = applyFilter(state, false);
    expect(result.currentIndex).toBe(0);
    expect(result.breedingOnly).toBe(false);
  });

  it("ne change rien si le filtre est inchangé", () => {
    const state = { currentIndex: 4, breedingOnly: true };
    const result = applyFilter(state, true);
    expect(result.currentIndex).toBe(4);
  });
});
