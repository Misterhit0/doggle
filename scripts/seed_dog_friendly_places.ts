import "dotenv/config";
import { getDb, createDogFriendlyPlace } from "../server/db";

const DEFAULT_PLACES = [
  {
    name: "Parc des Buttes-Chaumont (Zone Chiens)",
    placeType: "park" as const,
    latitude: 48.8806,
    longitude: 2.3826,
    address: "1 Rue Botzaris, 75019 Paris",
    description: "Grand parc avec de superbes reliefs. Chiens admis en laisse sur les allées périphériques.",
    osmId: "mock-1",
    isDogsAllowed: true,
    attributes: { leashRequired: true, waterAvailable: true },
  },
  {
    name: "Plage de l'Espiguette (Zone Canine)",
    placeType: "beach" as const,
    latitude: 43.4902,
    longitude: 4.1378,
    address: "Route de l'Espiguette, 30240 Le Grau-du-Roi",
    description: "Immense plage sauvage avec une zone dédiée pour les chiens en toute liberté.",
    osmId: "mock-2",
    isDogsAllowed: true,
    attributes: { leashRequired: false, waterAvailable: false },
  },
  {
    name: "Le Toutou Bar & Restaurant",
    placeType: "restaurant" as const,
    latitude: 48.8534,
    longitude: 2.3488,
    address: "15 Rue de la Harpe, 75005 Paris",
    description: "Restaurant chaleureux servant des bols d'eau et des friandises pour vos compagnons.",
    osmId: "mock-3",
    isDogsAllowed: true,
    attributes: { leashRequired: true, waterAvailable: true },
  },
  {
    name: "Hôtel Le Bristol Paris (Dog Friendly)",
    placeType: "hotel" as const,
    latitude: 48.8718,
    longitude: 2.3146,
    address: "112 Rue du Faubourg Saint-Honoré, 75008 Paris",
    description: "Hôtel de luxe accueillant les chiens avec un accueil personnalisé et des couchages dédiés.",
    osmId: "mock-4",
    isDogsAllowed: true,
    attributes: { leashRequired: true, waterAvailable: true },
  },
  {
    name: "Parc Borély (Zone Canine)",
    placeType: "park" as const,
    latitude: 43.2625,
    longitude: 5.3813,
    address: "Avenue du Prado, 13008 Marseille",
    description: "Superbe parc marseillais avec de grandes pelouses et allées ombragées.",
    osmId: "mock-marseille-1",
    isDogsAllowed: true,
    attributes: { leashRequired: true, waterAvailable: true },
  },
  {
    name: "Plage de la Pointe Rouge (Zone Canine)",
    placeType: "beach" as const,
    latitude: 43.2452,
    longitude: 5.3725,
    address: "Avenue de la Pointe Rouge, 13008 Marseille",
    description: "Plage autorisée aux chiens pour se rafraîchir en toute tranquillité.",
    osmId: "mock-marseille-2",
    isDogsAllowed: true,
    attributes: { leashRequired: false, waterAvailable: false },
  },
  {
    name: "Le Cabanon Marseille (Acceptant Chiens)",
    placeType: "restaurant" as const,
    latitude: 43.2952,
    longitude: 5.3745,
    address: "Quai du Port, 13002 Marseille",
    description: "Restaurant avec terrasse sur le Vieux-Port qui accueille avec plaisir les chiens de toutes tailles.",
    osmId: "mock-marseille-3",
    isDogsAllowed: true,
    attributes: { leashRequired: true, waterAvailable: true },
  }
];

async function seed() {
  console.log("🌱 Seeding dog friendly places...");

  // 1. Seed fallback default places to ensure database always has high-quality POIs
  for (const place of DEFAULT_PLACES) {
    try {
      await createDogFriendlyPlace(place);
      console.log(`✅ Seeded default place: ${place.name}`);
    } catch (e: any) {
      if (e.code === "ER_DUP_ENTRY") {
        console.log(`ℹ️ Default place already exists: ${place.name}`);
      } else {
        console.error(`❌ Failed to seed ${place.name}:`, e.message);
      }
    }
  }

  // 2. Attempt to fetch from Overpass API (OpenStreetMap) around Paris and Marseille
  const cities = [
    { name: "Paris", lat: 48.8566, lng: 2.3522 },
    { name: "Marseille", lat: 43.2964, lng: 5.3697 }
  ];

  for (const city of cities) {
    try {
      const radius = 5000; // 5km around city center
      const query = `[out:json];(
        node(around:${radius},${city.lat},${city.lng})[leisure=park];
        node(around:${radius},${city.lat},${city.lng})[natural=beach];
        node(around:${radius},${city.lat},${city.lng})[amenity=restaurant]["dog"="yes"];
        node(around:${radius},${city.lat},${city.lng})[amenity=cafe]["dog"="yes"];
      );out;`;

      console.log(`📡 Fetching from Overpass API for ${city.name}...`);
      const response = await fetch(`https://overpass-api.interpreter.website/interpreter?data=${encodeURIComponent(query)}`, {
        headers: { "User-Agent": "WoofyzDogFriendlyPlacesSeeder/1.0" },
        signal: AbortSignal.timeout(15000), // 15s timeout
      });

      if (response.ok) {
        const data = await response.json();
        const elements = data.elements || [];
        console.log(`📡 Overpass returned ${elements.length} elements for ${city.name}.`);

        for (const el of elements) {
          const typeMap: Record<string, "park" | "beach" | "restaurant" | "hotel" | "other"> = {
            park: "park",
            beach: "beach",
            restaurant: "restaurant",
            cafe: "restaurant",
            hotel: "hotel",
          };

          const placeType = typeMap[el.tags.leisure] || typeMap[el.tags.natural] || typeMap[el.tags.amenity] || "other";
          const name = el.tags.name || `${placeType.charAt(0).toUpperCase() + placeType.slice(1)} (${city.name} OSM)`;

          try {
            await createDogFriendlyPlace({
              name,
              placeType,
              latitude: el.lat,
              longitude: el.lon,
              address: el.tags["addr:street"] ? `${el.tags["addr:housenumber"] || ""} ${el.tags["addr:street"]}, ${el.tags["addr:postcode"] || ""} ${el.tags["addr:city"] || ""}` : undefined,
              description: `Imported from OpenStreetMap (OSM ID: ${el.id}).`,
              osmId: `osm-${el.id}`,
              isDogsAllowed: el.tags.dog !== "no",
              attributes: {
                leashRequired: el.tags.dog === "leash",
                waterAvailable: el.tags.water_point === "yes",
              }
            });
            console.log(`✅ Seeded OSM place: ${name}`);
          } catch (e: any) {
            if (e.code === "ER_DUP_ENTRY") {
              // Already imported
            } else {
              console.error(`❌ Failed to seed OSM place ${name}:`, e.message);
            }
          }
        }
      } else {
        console.log(`⚠️ Overpass API returned non-ok status for ${city.name}, using fallback mock seeding only.`);
      }
    } catch (err: any) {
      console.log(`⚠️ Failed to reach Overpass API for ${city.name} (timeout or network error), using default seeding.`);
    }
  }

  console.log("🏁 Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
