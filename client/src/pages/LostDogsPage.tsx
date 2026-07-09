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
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [marker, setMarker] = useState<maplibregl.Marker | null>(null);
  const [pickedAddress, setPickedAddress] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Address search using Nominatim (OpenStreetMap Geocoding API)
  const handleAddressSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
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

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleAddressSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const address = result.display_name;

    setSearchQuery(address);
    setSearchResults([]);

    if (map) {
      map.setCenter([lon, lat]);
      map.setZoom(16);
      placeMarkerOnMap(map, lat, lon, address);
    }
  };

  const placeMarkerOnMap = (mapInstance: maplibregl.Map, lat: number, lng: number, address: string) => {
    setMarker(prev => {
      if (prev) prev.remove();

      // Create a nice retro pin element
      const el = document.createElement("div");
      el.className = "w-6 h-6 bg-red-600 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ring-4 ring-red-500/30 animate-bounce";

      const newMarker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapInstance);

      return newMarker;
    });

    setPickedAddress(address);
    onLocationPicked(lat, lng, address);
  };

  const handleReverseGeocode = async (mapInstance: maplibregl.Map, lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      placeMarkerOnMap(mapInstance, lat, lng, address);
      setSearchQuery(address);
    } catch (e) {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      placeMarkerOnMap(mapInstance, lat, lng, fallback);
      setSearchQuery(fallback);
    }
  };

  const handleMapReady = useCallback((mapInstance: maplibregl.Map) => {
    setMap(mapInstance);

    // Initial marker if coordinates exist
    if (initialLat && initialLng) {
      handleReverseGeocode(mapInstance, initialLat, initialLng);
    }

    // Add click event for placing pins
    mapInstance.on("click", (e) => {
      const { lat, lng } = e.lngLat;
      handleReverseGeocode(mapInstance, lat, lng);
    });
  }, [initialLat, initialLng]);

  return (
    <div className="space-y-2 relative">
      {/* Address search input */}
      <div className="relative">
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
          <Navigation size={12} />
          <span>{label} — Cliquez sur la carte pour placer le marqueur</span>
        </div>
        <MapView
          onMapReady={handleMapReady}
          initialCenter={
            initialLat && initialLng
              ? { lat: initialLat, lng: initialLng }
              : { lat: 48.8566, lng: 2.3522 }
          }
          initialZoom={13}
          className="w-full h-[260px]"
        />
      </div>

      {/* Selected address display */}
      {pickedAddress && (
        <div className="flex items-center gap-2 bg-red-50 border-2 border-red-300 rounded-lg px-3 py-2">
          <MapPin size={14} className="text-red-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-red-800 truncate">{pickedAddress}</span>
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

  // Map for showing all lost dogs
  const [listMap, setListMap] = useState<maplibregl.Map | null>(null);
  const listMarkersRef = useRef<maplibregl.Marker[]>([]);

  const reportLostDogMutation = trpc.lostDogs.reportLostDog.useMutation();
  const reportSightingMutation = trpc.lostDogs.reportSighting.useMutation();
  const { data: userDogs } = trpc.dog.getMyDogs.useQuery(undefined);
  const { data: nearbyLostDogs, refetch: refetchLostDogs } = trpc.lostDogs.getNearbyLostDogs.useQuery(
    latitude && longitude ? { latitude, longitude, radiusKm: 25 } : { latitude: 0, longitude: 0 },
    { enabled: !!latitude && !!longitude }
  );
  const { refetch: refetchSightings } = trpc.lostDogs.getSightings.useQuery(
    selectedDogId ? { lostDogId: selectedDogId } : { lostDogId: 0 },
    { enabled: !!selectedDogId }
  );

  // Place markers for lost dogs on the overview map
  useEffect(() => {
    if (!listMap || !nearbyLostDogs || !Array.isArray(nearbyLostDogs)) return;

    // Clear old markers
    listMarkersRef.current.forEach(m => m.remove());
    listMarkersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();

    (nearbyLostDogs as any[]).forEach((dog) => {
      if (!dog.latitude || !dog.longitude) return;

      const lostDate = new Date(dog.lostDate).toLocaleDateString("fr-FR", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
      });

      // Custom marker DOM element
      const el = document.createElement("div");
      el.className = "flex items-center justify-center bg-red-500 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-110 transition-transform cursor-pointer";
      el.style.width = "34px";
      el.style.height = "34px";
      el.style.fontSize = "16px";
      el.innerText = "🐕";

      // Popup
      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
        <div style="font-family: sans-serif; max-width: 200px; padding: 4px;">
          <h3 style="font-weight: 900; font-size: 14px; color: #dc2626; margin: 0 0 3px 0; text-transform: uppercase;">${dog.name}</h3>
          <p style="font-size: 11px; color: #666; margin: 0 0 4px 0;">${dog.breed || ""} ${dog.age ? `• ${dog.age} ans` : ""}</p>
          <p style="font-size: 11px; margin: 0 0 3px 0;">📅 Perdu le ${lostDate}</p>
          <p style="font-size: 11px; margin: 0;">📍 ${dog.lostLocation}</p>
          ${dog.reward ? `<p style="font-size: 11px; font-weight: 900; color: #dc2626; margin: 4px 0 0 0;">💰 Récompense</p>` : ""}
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([Number(dog.longitude), Number(dog.latitude)])
        .setPopup(popup)
        .addTo(listMap);

      listMarkersRef.current.push(marker);
      bounds.extend([Number(dog.longitude), Number(dog.latitude)]);
    });

    // Fit bounds
    if (listMarkersRef.current.length > 0) {
      if (longitude && latitude) bounds.extend([longitude, latitude]);
      listMap.fitBounds(bounds, { padding: 40, maxZoom: 14 });
    }
  }, [listMap, nearbyLostDogs, latitude, longitude]);

  const handleReportLostDog = async () => {
    if (!formData.dogId || !formData.description || !formData.lostDate || !formData.lostLocation) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }
    const lat = formData.lostLat || latitude;
    const lng = formData.lostLng || longitude;
    if (!lat || !lng) {
      toast.error("Géolocalisation requise — placez un marqueur sur la carte");
      return;
    }
    try {
      await reportLostDogMutation.mutateAsync({
        dogId: formData.dogId,
        description: formData.description,
        lostDate: new Date(formData.lostDate),
        lostLocation: formData.lostLocation,
        latitude: lat,
        longitude: lng,
        reward: formData.reward || undefined,
        contactPhone: formData.contactPhone || undefined,
      });
      toast.success("Chien signalé comme perdu !");
      setFormData({ dogId: 0, description: "", lostDate: "", lostLocation: "", lostLat: null, lostLng: null, reward: "", contactPhone: "" });
      setIsReporting(false);
      refetchLostDogs();
    } catch (error) {
      toast.error("Erreur lors du signalement");
    }
  };

  const handleReportSighting = async () => {
    if (!sightingData.lostDogId || !sightingData.location || !sightingData.sightingDate || !sightingData.description) {
      toast.error("Remplissez tous les champs");
      return;
    }
    const lat = sightingData.sightingLat || latitude;
    const lng = sightingData.sightingLng || longitude;
    if (!lat || !lng) {
      toast.error("Placez un marqueur sur la carte pour indiquer où vous avez vu le chien");
      return;
    }
    try {
      await reportSightingMutation.mutateAsync({
        lostDogId: sightingData.lostDogId,
        location: sightingData.location,
        latitude: lat,
        longitude: lng,
        sightingDate: new Date(sightingData.sightingDate),
        description: sightingData.description,
        confidence: sightingData.confidence,
      });
      toast.success("Signalement de repérage envoyé !");
      setSightingData({ lostDogId: 0, location: "", sightingLat: null, sightingLng: null, sightingDate: "", description: "", confidence: "likely" });
      setIsSighting(false);
      refetchSightings();
    } catch (error) {
      toast.error("Erreur lors du signalement");
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

          {/* Overview Map — all lost dogs nearby */}
          {latitude && longitude && (
            <div className="mb-10 rounded-2xl overflow-hidden border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" style={{ borderWidth: '3px' }}>
              <div className="bg-red-600 px-4 py-2 flex items-center gap-2">
                <AlertCircle size={14} className="text-white" />
                <span className="text-white text-sm font-bold uppercase tracking-wider">Carte des chiens perdus à proximité</span>
                <span className="ml-auto text-white/80 text-xs font-semibold">
                  {Array.isArray(nearbyLostDogs) ? nearbyLostDogs.length : 0} signalement{(Array.isArray(nearbyLostDogs) ? nearbyLostDogs.length : 0) > 1 ? "s" : ""} • rayon 25 km
                </span>
              </div>
              <MapView
                onMapReady={(mapInstance) => {
                  setListMap(mapInstance);
                  mapInstance.setCenter([longitude, latitude]);
                  mapInstance.setZoom(12);
                }}
                initialCenter={{ lat: latitude, lng: longitude }}
                initialZoom={12}
                className="w-full h-[320px]"
              />
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
