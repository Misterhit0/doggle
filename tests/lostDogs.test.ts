/**
 * Tests unitaires — Carte des chiens perdus + POI (vétérinaires & spas)
 *
 * Couvre :
 * 1. Filtrage des POI par type (vet/spa)
 * 2. Extraction des données Overpass
 * 3. Visibilité des marqueurs (toggle show/hide)
 * 4. Chiens urgents vs récents
 */

import { describe, it, expect } from "vitest";

// ─── 1. Filtrage POI par type ────────────────────────────────────────────────

describe("LostDogsMap - POI type detection", () => {
  function classifyPOI(el: { tags?: { amenity?: string; shop?: string } }) {
    if (el.tags?.amenity === "veterinary") return "vet";
    if (el.tags?.shop === "pet_grooming") return "spa";
    return "unknown";
  }

  it("classifie correctement un vétérinaire", () => {
    expect(classifyPOI({ tags: { amenity: "veterinary" } })).toBe("vet");
  });

  it("classifie correctement un spa/toiletteur", () => {
    expect(classifyPOI({ tags: { shop: "pet_grooming" } })).toBe("spa");
  });

  it("retourne unknown pour un POI non reconnu", () => {
    expect(classifyPOI({ tags: { amenity: "pharmacy" } })).toBe("unknown");
  });

  it("retourne unknown si pas de tags", () => {
    expect(classifyPOI({})).toBe("unknown");
  });
});

// ─── 2. Extraction des données Overpass ─────────────────────────────────────

describe("LostDogsMap - Overpass element parsing", () => {
  function parseOverpassElement(el: {
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!lat || !lng) return null;

    return {
      lat,
      lng,
      name: el.tags?.name ?? (el.tags?.amenity === "veterinary" ? "Vétérinaire" : "Spa"),
      phone: el.tags?.phone ?? el.tags?.["contact:phone"] ?? "",
      address: [
        el.tags?.["addr:housenumber"],
        el.tags?.["addr:street"],
        el.tags?.["addr:city"],
      ]
        .filter(Boolean)
        .join(" "),
      openingHours: el.tags?.opening_hours ?? "",
    };
  }

  it("parse un node simple avec coordonnées directes", () => {
    const el = {
      lat: 48.8566,
      lon: 2.3522,
      tags: { name: "Clinique Vétérinaire Paris", amenity: "veterinary", phone: "01 23 45 67 89" },
    };
    const result = parseOverpassElement(el);
    expect(result).not.toBeNull();
    expect(result?.lat).toBe(48.8566);
    expect(result?.lng).toBe(2.3522);
    expect(result?.name).toBe("Clinique Vétérinaire Paris");
    expect(result?.phone).toBe("01 23 45 67 89");
  });

  it("parse un way avec center", () => {
    const el = {
      center: { lat: 45.75, lon: 4.83 },
      tags: { amenity: "veterinary" },
    };
    const result = parseOverpassElement(el);
    expect(result).not.toBeNull();
    expect(result?.lat).toBe(45.75);
    expect(result?.name).toBe("Vétérinaire");
  });

  it("retourne null si pas de coordonnées", () => {
    const el = { tags: { amenity: "veterinary" } };
    const result = parseOverpassElement(el);
    expect(result).toBeNull();
  });

  it("construit l'adresse correctement", () => {
    const el = {
      lat: 48.85,
      lon: 2.35,
      tags: {
        "addr:housenumber": "12",
        "addr:street": "Rue de la Paix",
        "addr:city": "Paris",
      },
    };
    const result = parseOverpassElement(el);
    expect(result?.address).toBe("12 Rue de la Paix Paris");
  });

  it("gère une adresse incomplète", () => {
    const el = {
      lat: 48.85,
      lon: 2.35,
      tags: { "addr:city": "Lyon" },
    };
    const result = parseOverpassElement(el);
    expect(result?.address).toBe("Lyon");
  });
});

// ─── 3. Logique toggle visibilité marqueurs ──────────────────────────────────

describe("LostDogsMap - Marker visibility toggle", () => {
  function applyVisibility(markers: { visible: boolean }[], show: boolean) {
    return markers.map((m) => ({ ...m, visible: show }));
  }

  it("masque tous les marqueurs vets quand showVets = false", () => {
    const markers = [{ visible: true }, { visible: true }, { visible: true }];
    const result = applyVisibility(markers, false);
    expect(result.every((m) => !m.visible)).toBe(true);
  });

  it("affiche tous les marqueurs spas quand showSpas = true", () => {
    const markers = [{ visible: false }, { visible: false }];
    const result = applyVisibility(markers, true);
    expect(result.every((m) => m.visible)).toBe(true);
  });
});

// ─── 4. Classification urgence chiens perdus ─────────────────────────────────

describe("LostDogsPage - Urgency classification", () => {
  function daysSinceLost(lostDate: Date): number {
    return (Date.now() - lostDate.getTime()) / (1000 * 60 * 60 * 24);
  }

  function classifyDogs(dogs: { lostDate: Date }[]) {
    const urgent = dogs.filter((d) => daysSinceLost(d.lostDate) <= 7);
    const recent = dogs.filter((d) => daysSinceLost(d.lostDate) > 7);
    return { urgent, recent };
  }

  it("classe un chien perdu hier comme urgent", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { urgent } = classifyDogs([{ lostDate: yesterday }]);
    expect(urgent).toHaveLength(1);
  });

  it("classe un chien perdu il y a 10 jours comme récent", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const { recent } = classifyDogs([{ lostDate: tenDaysAgo }]);
    expect(recent).toHaveLength(1);
  });

  it("classe correctement un mélange de chiens", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const old = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const { urgent, recent } = classifyDogs([
      { lostDate: yesterday },
      { lostDate: lastWeek },
      { lostDate: old },
    ]);
    // yesterday = urgent, lastWeek = 7 jours = urgent (<=7), old = recent
    expect(urgent).toHaveLength(2);
    expect(recent).toHaveLength(1);
  });
});
