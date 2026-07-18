import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, MapPin, Phone, Heart, Plus, Clock, AlertTriangle, Eye, Search, Navigation } from "lucide-react";
import { toast } from "sonner";
import MemphisBackground from "@/components/MemphisBackground";
import { MapView } from "@/components/Map";
import maplibregl from "maplibre-gl";

// ── Mini map component with MapLibre & Nominatim (OSM) Geocoding ───────────
interface LocationPickerMapProps {
  onLocationPicked: (lat: number, lng: number, address: string) => void;
  initialLat?: number | null;
  initialLng?: number | null;
  label: string;
}

function LocationPickerMap({ onLocationPicked, initialLat, initialLng, label }: LocationPickerMapProps) {
  const [pickedAddress, setPickedAddress] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  // Use refs to avoid stale closures inside maplibre event listeners
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onLocationPickedRef = useRef(onLocationPicked);
  onLocationPickedRef.current = onLocationPicked;

  // Address search using Nominatim (OpenStreetMap Geocoding API)
  const handleAddressSearch = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=fr&limit=5`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.error("Geocoding failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search — 600ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 2) handleAddressSearch(searchQuery);
      else setSearchResults([]);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const placeMarker = (lat: number, lng: number, address: string) => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    // Remove old marker
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }

    // Custom retro SVG pin
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="position:relative;width:32px;height:42px;cursor:pointer">
        <svg viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26S32 26 32 16C32 7.163 24.837 0 16 0z"
            fill="#dc2626" stroke="#000" stroke-width="2"/>
          <circle cx="16" cy="16" r="7" fill="white" stroke="#000" stroke-width="1.5"/>
          <circle cx="16" cy="16" r="4" fill="#dc2626"/>
        </svg>
      </div>`;

    const newMarker = new maplibregl.Marker({ element: el.firstElementChild as HTMLElement, anchor: "bottom" })
      .setLngLat([lng, lat])
      .addTo(mapInstance);
    markerRef.current = newMarker;

    setPickedAddress(address);
    onLocationPickedRef.current(lat, lng, address);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      placeMarker(lat, lng, address);
      setSearchQuery(address);
    } catch {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      placeMarker(lat, lng, fallback);
      setSearchQuery(fallback);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Store reverseGeocode in a ref so the map click listener is NEVER stale
  const reverseGeocodeRef = useRef(reverseGeocode);
  reverseGeocodeRef.current = reverseGeocode;

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const address = result.display_name;
    setSearchQuery(address);
    setSearchResults([]);
    const mapInstance = mapRef.current;
    if (mapInstance) {
      mapInstance.flyTo({ center: [lon, lat], zoom: 16, duration: 800 });
      placeMarker(lat, lon, address);
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) { toast.error("Géolocalisation non disponible sur cet appareil"); return; }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 800 });
        reverseGeocodeRef.current(lat, lng);
        setIsGeolocating(false);
      },
      () => { toast.error("Impossible d'obtenir votre position GPS"); setIsGeolocating(false); },
      { timeout: 10000 }
    );
  };

  const handleMapReady = useCallback((mapInstance: maplibregl.Map) => {
    mapRef.current = mapInstance;

    // Crosshair cursor = visual hint that clicking places a pin
    mapInstance.getCanvas().style.cursor = "crosshair";

    // Initial marker if coordinates provided
    if (initialLat && initialLng) {
      mapInstance.setCenter([initialLng, initialLat]);
      reverseGeocodeRef.current(initialLat, initialLng);
    }

    // ✅ Click via ref — no stale closure bug
    mapInstance.on("click", (e) => {
      const { lat, lng } = e.lngLat;
      reverseGeocodeRef.current(lat, lng);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2 relative">
      {/* Address search input + geolocate button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une adresse..."
            className="w-full pl-9 pr-4 py-2.5 border-2 border-black rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white text-black"
          />
          {isSearching && (
            <span className="absolute right-3 top-3.5 text-xs text-muted-foreground animate-pulse">Recherche...</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={isGeolocating}
          title="Utiliser ma position GPS actuelle"
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white border-2 border-black rounded-lg text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all whitespace-nowrap cursor-pointer"
        >
          <Navigation size={14} className={isGeolocating ? "animate-spin" : ""} />
          {isGeolocating ? "Localisation..." : "Ma position"}
        </button>
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className="absolute left-0 right-0 z-50 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-48 overflow-y-auto divide-y divide-gray-100">
          {searchResults.map((res, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectSearchResult(res)}
              className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-yellow-50 text-black flex items-start gap-2"
            >
              <MapPin size={12} className="text-red-500 mt-0.5 flex-shrink-0" />
              <span>{res.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Map container */}
      <div className="rounded-xl overflow-hidden border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] relative">
        <div className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2">
          <MapPin size={12} />
          <span>{label} — Touchez / cliquez sur la carte pour placer l'épingle 📍</span>
          {isGeocoding && <span className="ml-auto animate-pulse font-normal">Résolution adresse...</span>}
        </div>
        <MapView
          onMapReady={handleMapReady}
          initialCenter={
            initialLat && initialLng
              ? { lat: initialLat, lng: initialLng }
              : { lat: 48.8566, lng: 2.3522 }
          }
          initialZoom={13}
          className="w-full h-[280px]"
        />
      </div>

      {/* Selected address display */}
      {pickedAddress && (
        <div className="flex items-start gap-2 bg-red-50 border-2 border-red-300 rounded-lg px-3 py-2">
          <MapPin size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
          <span className="text-xs font-semibold text-red-800">{pickedAddress}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function LostDogsPage() {
  const { user } = useAuth();
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);
  const [isSighting, setIsSighting] = useState(false);

  // Lost dog report form
  const [formData, setFormData] = useState({
    dogId: 0,
    description: "",
    lostDate: "",
    lostLocation: "",
    lostLat: null as number | null,
    lostLng: null as number | null,
    reward: "",
    contactPhone: "",
  });

  // Sighting form
  const [sightingData, setSightingData] = useState({
    lostDogId: 0,
    location: "",
    sightingLat: null as number | null,
    sightingLng: null as number | null,
    sightingDate: "",
    description: "",
    confidence: "likely" as "certain" | "likely" | "possible",
  });

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
      });
    }
  }, []);

  // Map for showing all lost dogs — use ref to avoid React state race condition
  const listMapRef = useRef<maplibregl.Map | null>(null);
  const [listMap, setListMap] = useState<maplibregl.Map | null>(null);
  const listMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Vets & Spas from Overpass API
  const vetMarkersRef = useRef<maplibregl.Marker[]>([]);
  const spaMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [showVets, setShowVets] = useState(true);
  const [showSpas, setShowSpas] = useState(true);
  const [poiLoading, setPoiLoading] = useState(false);
  const showVetsRef = useRef(true);
  const showSpasRef = useRef(true);
  showVetsRef.current = showVets;
  showSpasRef.current = showSpas;

  // PetAlert RSS markers
  const petAlertMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [showPetAlert, setShowPetAlert] = useState(true);
  const [petAlertLoading, setPetAlertLoading] = useState(false);
  const [petAlertCount, setPetAlertCount] = useState(0);
  const [petAlertFallback, setPetAlertFallback] = useState(false); // true = fallback mode (Option B)

  const reportLostDogMutation = trpc.lostDogs.reportLostDog.useMutation();
  const reportSightingMutation = trpc.lostDogs.reportSighting.useMutation();
  const { data: userDogs } = trpc.dog.getMyDogs.useQuery(undefined);

  // ── Fetch vets & spas from Overpass OSM ────────────────────────────────────
  const fetchVetsAndSpas = useCallback(async (mapInstance: maplibregl.Map) => {
    setPoiLoading(true);
    const bounds = mapInstance.getBounds();
    const south = bounds.getSouth().toFixed(4);
    const west  = bounds.getWest().toFixed(4);
    const north = bounds.getNorth().toFixed(4);
    const east  = bounds.getEast().toFixed(4);
    const bbox  = `${south},${west},${north},${east}`;
    const query = `[out:json][timeout:10];(
      node["amenity"="veterinary"](${bbox});
      way["amenity"="veterinary"](${bbox});
      node["shop"="pet_grooming"](${bbox});
      way["shop"="pet_grooming"](${bbox});
    );out center;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const json = await res.json();

      // Remove old POI markers
      vetMarkersRef.current.forEach(m => m.remove());
      vetMarkersRef.current = [];
      spaMarkersRef.current.forEach(m => m.remove());
      spaMarkersRef.current = [];

      json.elements?.forEach((el: any) => {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!lat || !lng) return;

        const isVet = el.tags?.amenity === "veterinary";
        const name = el.tags?.name || (isVet ? "Vétérinaire" : "Spa / Toilettage");
        const phone = el.tags?.phone || el.tags?.["contact:phone"] || "";
        const addr = [el.tags?.["addr:housenumber"], el.tags?.["addr:street"], el.tags?.["addr:city"]].filter(Boolean).join(" ");
        const openingHours = el.tags?.opening_hours || "";

        const markerEl = document.createElement("div");
        if (isVet) {
          markerEl.innerHTML = `<div style="width:32px;height:32px;background:#16a34a;border-radius:50%;border:2px solid #000;box-shadow:2px 2px 0 #000;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;transition:transform .15s" title="${name}">🏥</div>`;
        } else {
          markerEl.innerHTML = `<div style="width:32px;height:32px;background:#7c3aed;border-radius:50%;border:2px solid #000;box-shadow:2px 2px 0 #000;display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;transition:transform .15s" title="${name}">✂️</div>`;
        }
        const innerEl = markerEl.firstElementChild as HTMLElement;
        innerEl.onmouseenter = () => { innerEl.style.transform = "scale(1.2)"; };
        innerEl.onmouseleave = () => { innerEl.style.transform = "scale(1)"; };

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false }).setHTML(`
          <div style="font-family:sans-serif;max-width:210px;padding:6px">
            <h3 style="font-weight:900;font-size:13px;color:${isVet ? '#16a34a' : '#7c3aed'};margin:0 0 3px">${isVet ? '🏥' : '✂️'} ${name}</h3>
            ${addr ? `<p style="font-size:11px;color:#555;margin:0 0 3px">📍 ${addr}</p>` : ""}
            ${phone ? `<p style="font-size:11px;margin:0 0 3px"><a href="tel:${phone}" style="color:#2563eb;font-weight:700">📞 ${phone}</a></p>` : ""}
            ${openingHours ? `<p style="font-size:10px;color:#666;margin:0">🕐 ${openingHours}</p>` : ""}
          </div>
        `);

        const marker = new maplibregl.Marker({ element: innerEl })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(mapInstance);

        if (isVet) {
          vetMarkersRef.current.push(marker);
        } else {
          spaMarkersRef.current.push(marker);
        }
      });
    } catch (err) {
      console.error("[Overpass] Failed to fetch vets/spas:", err);
    } finally {
      setPoiLoading(false);
    }
  }, []);

  // ── Fetch PetAlert RSS via rss2json proxy (Option C) + fallback (Option B) ──
  const fetchPetAlertRSS = useCallback(async (mapInstance: maplibregl.Map, lat: number | null, lng: number | null) => {
    setPetAlertLoading(true);
    setPetAlertFallback(false);

    // Build department list from user location (approximate)
    // PetAlert RSS: https://www.petalert.fr/fr/alerts/rss?type=lost&radius=20&lat=LAT&lon=LNG
    const center = lat && lng
      ? { lat, lng }
      : { lat: 46.603354, lng: 1.888334 };

    // We use rss2json.com as CORS proxy — free tier, no key required for public feeds
    const petAlertRssUrl = `https://www.petalert.fr/fr/alerts/rss?type=lost&lat=${center.lat}&lon=${center.lng}&radius=50`;
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(petAlertRssUrl)}`;

    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      const json = await res.json();

      if (json.status !== "ok" || !json.items?.length) {
        // Option C returned 0 results → activate Option B fallback
        setPetAlertFallback(true);
        setPetAlertCount(0);
        return;
      }

      // Clear old PetAlert markers
      petAlertMarkersRef.current.forEach(m => m.remove());
      petAlertMarkersRef.current = [];

      let placed = 0;
      json.items.forEach((item: any) => {
        // Extract coords from content or enclosure (PetAlert embeds lat/lng in description)
        const latMatch = item.content?.match(/data-lat=["']([-\d.]+)["']/) ||
                         item.description?.match(/lat=([-\d.]+)/);
        const lngMatch = item.content?.match(/data-lng=["']([-\d.]+)["']/) ||
                         item.description?.match(/lon=([-\d.]+)/);

        // Fallback: parse geo from <geo:lat> / <geo:long> which rss2json sometimes exposes
        const itemLat = parseFloat(item.lat ?? latMatch?.[1] ?? "");
        const itemLng = parseFloat(item.long ?? lngMatch?.[1] ?? "");

        if (isNaN(itemLat) || isNaN(itemLng)) return;
        if (itemLat < 41 || itemLat > 52 || itemLng < -5 || itemLng > 10) return; // France bbox

        const title = item.title ?? "Chien perdu";
        const pubDate = item.pubDate
          ? new Date(item.pubDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
          : "";
        const description = item.description?.replace(/<[^>]+>/g, "").slice(0, 120) ?? "";
        const link = item.link ?? `https://www.petalert.fr/fr`;
        const thumbnail = item.thumbnail ?? item.enclosure?.link ?? "";

        const markerEl = document.createElement("div");
        markerEl.innerHTML = `<div style="width:34px;height:34px;background:#f97316;border-radius:50%;border:2.5px solid #000;box-shadow:2px 2px 0 #000;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;transition:transform .15s" title="${title.replace(/"/g, "'")}">🔶</div>`;
        const innerEl = markerEl.firstElementChild as HTMLElement;
        innerEl.onmouseenter = () => { innerEl.style.transform = "scale(1.2)"; };
        innerEl.onmouseleave = () => { innerEl.style.transform = "scale(1)"; };

        const popup = new maplibregl.Popup({ offset: 20, closeButton: false, maxWidth: "230px" }).setHTML(`
          <div style="font-family:sans-serif;padding:6px">
            ${thumbnail ? `<img src="${thumbnail}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:6px;border:1px solid #eee" onerror="this.style.display='none'" />` : ""}
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:3px">
              <img src="https://www.petalert.fr/favicon.ico" style="width:14px;height:14px" onerror="this.style.display='none'" />
              <span style="font-size:10px;color:#f97316;font-weight:900;text-transform:uppercase">PetAlert</span>
            </div>
            <h3 style="font-weight:900;font-size:13px;color:#dc2626;margin:0 0 3px">${title}</h3>
            ${pubDate ? `<p style="font-size:10px;color:#888;margin:0 0 3px">📅 ${pubDate}</p>` : ""}
            ${description ? `<p style="font-size:11px;color:#444;margin:0 0 6px;line-height:1.4">${description}…</p>` : ""}
            <a href="${link}" target="_blank" rel="noopener" style="display:inline-block;background:#f97316;color:white;font-weight:900;font-size:10px;padding:4px 8px;border-radius:4px;border:1px solid #000;text-decoration:none">Voir sur PetAlert →</a>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: innerEl })
          .setLngLat([itemLng, itemLat])
          .setPopup(popup)
          .addTo(mapInstance);

        petAlertMarkersRef.current.push(marker);
        placed++;
      });

      setPetAlertCount(placed);
      if (placed === 0) {
        setPetAlertFallback(true); // No coords parseable → Option B
      }
    } catch (err) {
      console.warn("[PetAlert RSS] Fetch failed, activating Option B fallback:", err);
      setPetAlertFallback(true);
      setPetAlertCount(0);
    } finally {
      setPetAlertLoading(false);
    }
  }, []);

  // Toggle PetAlert markers visibility
  useEffect(() => {
    petAlertMarkersRef.current.forEach(m => {
      const el = m.getElement();
      if (el) el.style.display = showPetAlert ? "" : "none";
    });
  }, [showPetAlert]);

  // Toggle visibility of vet/spa markers
  useEffect(() => {
    vetMarkersRef.current.forEach(m => {
      const el = m.getElement();
      if (el) el.style.display = showVets ? "" : "none";
    });
  }, [showVets]);
  useEffect(() => {
    spaMarkersRef.current.forEach(m => {
      const el = m.getElement();
      if (el) el.style.display = showSpas ? "" : "none";
    });
  }, [showSpas]);

  // Always load lost dogs — use large radius (500km = France-wide) if no geoloc yet
  const { data: nearbyLostDogs, refetch: refetchLostDogs } = trpc.lostDogs.getNearbyLostDogs.useQuery(
    latitude && longitude
      ? { latitude, longitude, radiusKm: 100 }
      : { latitude: 46.603354, longitude: 1.888334, radiusKm: 500 },
    { refetchOnWindowFocus: false }
  );
  const { refetch: refetchSightings } = trpc.lostDogs.getSightings.useQuery(
    selectedDogId ? { lostDogId: selectedDogId } : { lostDogId: 0 },
    { enabled: !!selectedDogId }
  );

  // Helper: place all lost-dog markers on a given map instance
  const placeMarkersOnMap = useCallback((mapInstance: maplibregl.Map, dogs: any[]) => {
    // Remove old markers
    listMarkersRef.current?.forEach(m => m.remove());
    listMarkersRef.current = [];

    if (!Array.isArray(dogs) || dogs.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    dogs.forEach((dog) => {
      if (!dog.latitude || !dog.longitude) return;

      const lostDate = new Date(dog.lostDate).toLocaleDateString("fr-FR", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
      });

      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#ef4444;border-radius:50%;border:2px solid #000;box-shadow:2px 2px 0 #000;font-size:18px;cursor:pointer;transition:transform .15s";
      el.innerText = "🐕";
      el.onmouseenter = () => { el.style.transform = "scale(1.2)"; };
      el.onmouseleave = () => { el.style.transform = "scale(1)"; };

      const popup = new maplibregl.Popup({ offset: 22, closeButton: false }).setHTML(`
        <div style="font-family:sans-serif;max-width:200px;padding:6px">
          <h3 style="font-weight:900;font-size:14px;color:#dc2626;margin:0 0 3px;text-transform:uppercase">${dog.name}</h3>
          <p style="font-size:11px;color:#666;margin:0 0 4px">${dog.breed || ""} ${dog.age ? `• ${dog.age} ans` : ""}</p>
          <p style="font-size:11px;margin:0 0 3px">📅 Perdu le ${lostDate}</p>
          <p style="font-size:11px;margin:0">📍 ${dog.lostLocation || "Lieu inconnu"}</p>
          ${dog.reward ? `<p style="font-size:11px;font-weight:900;color:#dc2626;margin:4px 0 0">💰 Récompense offerte</p>` : ""}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([Number(dog.longitude), Number(dog.latitude)])
        .setPopup(popup)
        .addTo(mapInstance);

      listMarkersRef.current.push(marker);
      bounds.extend([Number(dog.longitude), Number(dog.latitude)]);
    });

    if (listMarkersRef.current.length > 0) {
      mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
    }
  }, []);

  // Re-place markers whenever data OR map changes
  useEffect(() => {
    const mapInstance = listMapRef.current;
    if (!mapInstance || !nearbyLostDogs) return;
    placeMarkersOnMap(mapInstance, nearbyLostDogs as any[]);
  }, [listMap, nearbyLostDogs, placeMarkersOnMap]);


  const handleReportLostDog = async () => {
    // dogId=0 is falsy — check explicitly
    if (!(formData.dogId > 0)) {
      toast.error("Sélectionnez votre chien dans la liste");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Ajoutez une description de votre chien");
      return;
    }
    if (!formData.lostDate) {
      toast.error("Indiquez la date de disparition");
      return;
    }

    let lat = formData.lostLat ?? latitude;
    let lng = formData.lostLng ?? longitude;

    // Geocode address if text location is entered and we don't have map click coords
    if (formData.lostLocation.trim() && !formData.lostLat) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.lostLocation)}&countrycodes=fr&limit=1`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch (error) {
        console.error("Geocoding failed", error);
      }
    }

    if (!lat || !lng) {
      toast.error("Placez un marqueur sur la carte ou indiquez une adresse valide");
      return;
    }
    // lostLocation: use picked address or fallback to coords string
    const lostLocation = formData.lostLocation || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      await reportLostDogMutation.mutateAsync({
        dogId: formData.dogId,
        description: formData.description,
        lostDate: new Date(formData.lostDate),
        lostLocation,
        latitude: lat,
        longitude: lng,
        reward: formData.reward || undefined,
        contactPhone: formData.contactPhone || undefined,
      });
      toast.success("🚨 Chien signalé comme perdu !");
      setFormData({ dogId: 0, description: "", lostDate: "", lostLocation: "", lostLat: null, lostLng: null, reward: "", contactPhone: "" });
      setIsReporting(false);
      refetchLostDogs();
    } catch (error) {
      toast.error("Erreur lors du signalement — réessayez");
    }
  };

  const handleReportSighting = async () => {
    if (!sightingData.sightingDate) {
      toast.error("Indiquez la date et l'heure du repérage");
      return;
    }
    if (!sightingData.description.trim()) {
      toast.error("Ajoutez une description du repérage");
      return;
    }

    let lat = sightingData.sightingLat ?? latitude;
    let lng = sightingData.sightingLng ?? longitude;

    // Geocode address if text location is entered and we don't have map click coords
    if (sightingData.location.trim() && !sightingData.sightingLat) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sightingData.location)}&countrycodes=fr&limit=1`
        );
        const data = await response.json();
        if (data && data.length > 0) {
          lat = parseFloat(data[0].lat);
          lng = parseFloat(data[0].lon);
        }
      } catch (error) {
        console.error("Geocoding failed", error);
      }
    }

    if (!lat || !lng) {
      toast.error("Placez un marqueur sur la carte ou indiquez une adresse valide");
      return;
    }
    const location = sightingData.location || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      await reportSightingMutation.mutateAsync({
        // lostDogId=0 means unknown dog — backend will handle it
        lostDogId: sightingData.lostDogId > 0 ? sightingData.lostDogId : 0,
        location,
        latitude: lat,
        longitude: lng,
        sightingDate: new Date(sightingData.sightingDate),
        description: sightingData.description,
        confidence: sightingData.confidence,
      });
      toast.success("👁️ Repérage signalé !");
      setSightingData({ lostDogId: 0, location: "", sightingLat: null, sightingLng: null, sightingDate: "", description: "", confidence: "likely" });
      setIsSighting(false);
      refetchSightings();
    } catch (error) {
      toast.error("Erreur lors du signalement — réessayez");
    }
  };

  const urgentDogs = (nearbyLostDogs as any[])?.filter(dog => {
    const daysSinceLost = (Date.now() - new Date(dog.lostDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLost <= 7;
  }) || [];

  const recentDogs = (nearbyLostDogs as any[])?.filter(dog => {
    const daysSinceLost = (Date.now() - new Date(dog.lostDate).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLost > 7;
  }) || [];

  // Pre-compute PetAlert fallback URL (avoids nested template literals in JSX which break Babel)
  const petAlertFallbackUrl = latitude && longitude
    ? "https://www.petalert.fr/fr/alerts?type=lost&lat=" + latitude.toFixed(4) + "&lon=" + longitude.toFixed(4) + "&radius=20"
    : "https://www.petalert.fr/fr/alerts?type=lost";

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MemphisBackground />

      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-red-500 via-red-400 to-pink-400 rounded-3xl p-8 md:p-10 text-white border-4 border-black shadow-xl">
              <div className="flex items-start gap-4 mb-3">
                <AlertTriangle size={44} className="flex-shrink-0 animate-pulse" />
                <div>
                  <h1 className="text-5xl md:text-6xl font-black mb-1">CHIENS PERDUS</h1>
                  <p className="text-lg font-semibold">Aidez à retrouver les chiens perdus près de vous</p>
                </div>
              </div>
              <p className="text-sm opacity-90 mt-3">⏰ Chaque minute compte ! Signalez immédiatement et partagez avec votre communauté.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8 flex-wrap">
            {/* === Dialog: Signaler mon chien perdu === */}
            <Dialog open={isReporting} onOpenChange={setIsReporting}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-6 py-6 h-auto border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Plus size={24} /> Signaler mon chien perdu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">🔴 Signaler un chien perdu</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={formData.dogId.toString()} onValueChange={(value) => setFormData({ ...formData, dogId: parseInt(value) })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionnez votre chien" /></SelectTrigger>
                    <SelectContent>
                      {userDogs?.map((dog) => (
                        <SelectItem key={dog.id} value={dog.id.toString()}>{dog.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Textarea
                    placeholder="Description détaillée du chien (couleur, signes distinctifs, collier, etc.)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-24"
                  />

                  <Input
                    type="datetime-local"
                    value={formData.lostDate}
                    onChange={(e) => setFormData({ ...formData, lostDate: e.target.value })}
                    placeholder="Date et heure de disparition"
                  />

                  {/* Location Picker Map */}
                  <LocationPickerMap
                    label="Lieu de disparition"
                    initialLat={latitude}
                    initialLng={longitude}
                    onLocationPicked={(lat, lng, address) => {
                      setFormData(prev => ({
                        ...prev,
                        lostLat: lat,
                        lostLng: lng,
                        lostLocation: address,
                      }));
                    }}
                  />

                  <Input
                    placeholder="Récompense (optionnel, ex: 200€)"
                    value={formData.reward}
                    onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                  />
                  <Input
                    placeholder="Téléphone de contact (optionnel)"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                  <Button
                    onClick={handleReportLostDog}
                    className="w-full bg-red-500 hover:bg-red-600 font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    disabled={reportLostDogMutation.isPending}
                  >
                    {reportLostDogMutation.isPending ? "Signalement..." : "🚨 Signaler immédiatement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* === Dialog: J'ai vu un chien === */}
            <Dialog open={isSighting} onOpenChange={setIsSighting}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 font-bold text-lg px-6 py-6 h-auto border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Eye size={24} /> J'ai vu un chien
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">👁️ Signaler un repérage</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select
                    value={sightingData.lostDogId.toString()}
                    onValueChange={(value) => setSightingData({ ...sightingData, lostDogId: parseInt(value) })}
                  >
                    <SelectTrigger><SelectValue placeholder="Quel chien avez-vous vu ?" /></SelectTrigger>
                    <SelectContent>
                      {(nearbyLostDogs as any[])?.map((dog) => (
                        <SelectItem key={dog.id} value={dog.id.toString()}>🔴 {dog.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="datetime-local"
                    value={sightingData.sightingDate}
                    onChange={(e) => setSightingData({ ...sightingData, sightingDate: e.target.value })}
                    placeholder="Date et heure du repérage"
                  />

                  {/* Location Picker Map */}
                  <LocationPickerMap
                    label="Lieu du repérage"
                    initialLat={latitude}
                    initialLng={longitude}
                    onLocationPicked={(lat, lng, address) => {
                      setSightingData(prev => ({
                        ...prev,
                        sightingLat: lat,
                        sightingLng: lng,
                        location: address,
                      }));
                    }}
                  />

                  <Textarea
                    placeholder="Description du repérage (où exactement, comportement du chien, etc.)"
                    value={sightingData.description}
                    onChange={(e) => setSightingData({ ...sightingData, description: e.target.value })}
                    className="min-h-24"
                  />

                  <Select
                    value={sightingData.confidence}
                    onValueChange={(value) => setSightingData({ ...sightingData, confidence: value as any })}
                  >
                    <SelectTrigger><SelectValue placeholder="Certitude" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="certain">✅ Certain (c'est lui !)</SelectItem>
                      <SelectItem value="likely">🤔 Probable (ressemble beaucoup)</SelectItem>
                      <SelectItem value="possible">❓ Possible (pourrait être)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleReportSighting}
                    className="w-full bg-green-500 hover:bg-green-600 font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    disabled={reportSightingMutation.isPending}
                  >
                    {reportSightingMutation.isPending ? "Envoi..." : "✅ Envoyer le signalement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Overview Map — always shown, centers on user position if available */}
          <div className="mb-10 rounded-2xl overflow-hidden border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" style={{ borderWidth: '3px' }}>
            <div className="bg-red-600 px-4 py-2 flex items-center gap-2">
              <AlertCircle size={14} className="text-white" />
              <span className="text-white text-sm font-bold uppercase tracking-wider">Carte des chiens perdus en France</span>
              <span className="ml-auto text-white/80 text-xs font-semibold">
                {Array.isArray(nearbyLostDogs) ? nearbyLostDogs.length : 0} signalement{(Array.isArray(nearbyLostDogs) ? nearbyLostDogs.length : 0) > 1 ? "s" : ""} • rayon {latitude && longitude ? "100" : "500"} km
              </span>
            </div>
            <MapView
              onMapReady={(mapInstance) => {
                // Sync both ref (for markers) and state (to trigger useEffect)
                listMapRef.current = mapInstance;
                setListMap(mapInstance);
                // Center on user if available, otherwise France
                if (latitude && longitude) {
                  mapInstance.setCenter([longitude, latitude]);
                  mapInstance.setZoom(12);
                } else {
                  mapInstance.setCenter([2.3522, 46.6]);
                  mapInstance.setZoom(5);
                }
                // Place Woofyz markers immediately if data already loaded
                if (nearbyLostDogs && Array.isArray(nearbyLostDogs)) {
                  placeMarkersOnMap(mapInstance, nearbyLostDogs as any[]);
                }
                // Fetch vets & spas from Overpass
                fetchVetsAndSpas(mapInstance);
                // Re-fetch OSM POI on map move (only when zoomed in enough)
                mapInstance.on("moveend", () => {
                  if (mapInstance.getZoom() >= 11) fetchVetsAndSpas(mapInstance);
                });
                // Fetch PetAlert RSS (Option C) with fallback to Option B
                fetchPetAlertRSS(mapInstance, latitude, longitude);
              }}
              initialCenter={
                latitude && longitude
                  ? { lat: latitude, lng: longitude }
                  : { lat: 46.6, lng: 2.3522 }
              }
              initialZoom={latitude && longitude ? 12 : 5}
              className="w-full h-[360px]"
            />
          </div>

          {/* Legend + Filters */}
          <div className="flex flex-wrap gap-3 items-center px-1 py-2 mb-2">
            <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Afficher :</span>

            {/* Woofyz lost dogs */}
            <span className="flex items-center gap-1 text-sm font-bold">
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center border border-black">🐕</span>
              Woofyz
            </span>

            {/* PetAlert toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPetAlert}
                onChange={e => setShowPetAlert(e.target.checked)}
                className="accent-orange-500 w-3.5 h-3.5"
                disabled={petAlertFallback || petAlertLoading}
              />
              <span className="flex items-center gap-1 text-sm font-bold">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center border border-black">🔶</span>
                PetAlert
                {petAlertLoading && <span className="text-[9px] text-muted-foreground italic ml-0.5">…</span>}
                {!petAlertLoading && !petAlertFallback && petAlertCount > 0 && (
                  <span className="text-[9px] bg-orange-100 text-orange-700 border border-orange-300 px-1 rounded-full font-black">{petAlertCount}</span>
                )}
              </span>
            </label>

            {/* Vétérinaires */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={showVets} onChange={e => setShowVets(e.target.checked)} className="accent-green-600 w-3.5 h-3.5" />
              <span className="flex items-center gap-1 text-sm font-bold">
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center border border-black">🏥</span>
                Vétos
              </span>
            </label>

            {/* Spas */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={showSpas} onChange={e => setShowSpas(e.target.checked)} className="accent-purple-600 w-3.5 h-3.5" />
              <span className="flex items-center gap-1 text-sm font-bold">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center border border-black">✂️</span>
                Spas
              </span>
            </label>

            {(poiLoading) && <span className="text-xs text-muted-foreground italic">Chargement POIs…</span>}
            <span className="ml-auto text-xs text-muted-foreground">OSM · PetAlert</span>
          </div>

          {/* Option B fallback banner — shown when PetAlert RSS returned 0 results */}
          {/* Option B fallback banner — shown when PetAlert RSS returned 0 results */}
          {petAlertFallback && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-orange-50 border-2 border-orange-400 rounded-xl shadow-[3px_3px_0px_0px_rgba(249,115,22,0.4)]">
              <img
                src="https://www.petalert.fr/favicon.ico"
                alt="PetAlert"
                className="w-7 h-7 rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-orange-800">🔶 Voir les chiens perdus sur PetAlert.fr</p>
                <p className="text-xs text-orange-600">
                  Les données PetAlert ne sont pas disponibles en temps réel — consultez directement le site
                </p>
              </div>
              <a
                href={petAlertFallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black px-3 py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px"
              >
                Ouvrir PetAlert →
              </a>
            </div>
          )}


          {/* Urgent Dogs Section */}
          {urgentDogs.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={28} className="text-red-600 animate-pulse" />
                <h2 className="text-3xl font-black text-red-600">🚨 URGENT (moins de 7 jours)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {urgentDogs.map((dog: any) => (
                  <Card key={dog.id} className="p-6 border-4 border-red-500 bg-red-50 hover:shadow-2xl transition-all transform hover:scale-105">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-black text-2xl text-red-700">{dog.name}</h3>
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">URGENT</span>
                      </div>
                      <p className="font-semibold text-sm text-gray-700">{dog.breed} {dog.age ? `— ${dog.age} ans` : ""}</p>
                      <p className="text-sm text-gray-800 line-clamp-3">{dog.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 font-semibold">
                          <MapPin size={18} className="text-red-600" />
                          <span>{dog.lostLocation}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock size={18} className="text-orange-600" />
                          <span>Disparu depuis {Math.round((Date.now() - new Date(dog.lostDate).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                        </div>
                        {dog.contactPhone && (
                          <div className="flex items-center gap-2 font-semibold">
                            <Phone size={18} className="text-green-600" />
                            <span>{dog.contactPhone}</span>
                          </div>
                        )}
                        {dog.reward && <p className="font-black text-red-600">💰 Récompense : {dog.reward}</p>}
                      </div>
                      <Button
                        onClick={() => { setSelectedDogId(dog.id); setIsSighting(true); }}
                        className="w-full mt-4 bg-green-500 hover:bg-green-600 font-bold border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      >
                        ✅ J'ai vu ce chien !
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Recent Dogs Section */}
          {recentDogs.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Eye size={24} /> Autres chiens signalés
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentDogs.map((dog: any) => (
                  <Card key={dog.id} className="p-6 border-2 border-gray-300 hover:shadow-lg transition-shadow">
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg text-foreground">{dog.name}</h3>
                      <p className="text-sm text-muted-foreground">{dog.breed} {dog.age ? `— ${dog.age} ans` : ""}</p>
                      <p className="text-sm line-clamp-2">{dog.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-500" />
                          <span>{dog.lostLocation}</span>
                        </div>
                        {dog.contactPhone && (
                          <div className="flex items-center gap-2">
                            <Phone size={16} className="text-accent" />
                            <span>{dog.contactPhone}</span>
                          </div>
                        )}
                        {dog.reward && <p className="font-semibold text-accent">Récompense : {dog.reward}</p>}
                      </div>
                      <Button
                        onClick={() => { setSelectedDogId(dog.id); setIsSighting(true); }}
                        className="w-full mt-4"
                        variant="outline"
                      >
                        J'ai vu ce chien
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {nearbyLostDogs && (nearbyLostDogs as any[]).length === 0 && (
            <div className="text-center py-20">
              <Heart size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-2xl font-bold text-foreground mb-2">Aucun chien perdu signalé près de vous</p>
              <p className="text-muted-foreground mb-6">C'est une bonne nouvelle ! Restez vigilant et aidez les autres maîtres.</p>
              <Button className="gap-2">
                <Heart size={20} /> Partager cette page
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
