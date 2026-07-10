import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useWalkingTracking } from '@/hooks/useWalkingTracking';
import { MapView } from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Navigation, Home, AlertCircle, Check, X, ShieldCheck, EyeOff, Settings } from 'lucide-react';
import { toast } from 'sonner';
import WalkingMapFilters from '@/components/WalkingMapFilters';
import { createDogMarkerIcon, getDefaultMarkerIcon } from '@/lib/dogMarkerUtils';
import maplibregl from 'maplibre-gl';

export default function WalkingMapPage() {
  const { user } = useAuth();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [markers, setMarkers] = useState<maplibregl.Marker[]>([]);
  const [userMarker, setUserMarker] = useState<maplibregl.Marker | null>(null);
  const [homeMarker, setHomeMarker] = useState<maplibregl.Marker | null>(null);
  const [settingHome, setSettingHome] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<{ breed?: string; size?: string }>({});
  const [shareLocationPref, setShareLocationPref] = useState(false);
  const markerIconsRef = useRef<Map<string, string>>(new Map());

  const {
    isTracking,
    currentLat,
    currentLon,
    homeLat,
    homeLon,
    distanceToHome,
    isNearHome,
    hasAskedAboutPrivacy,
    startTracking,
    stopTracking,
    confirmPrivacyStop,
    continueSharing,
    setHomeLocation,
  } = useWalkingTracking();

  // Helper to parse dog photo URLs safely
  const parsePhotoUrls = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  };

  // Get active walkers — only if tracking AND sharing is enabled by checkbox
  const { data: activeWalkers, refetch: refetchWalkers } = trpc.discovery.getActiveWalkers.useQuery(
    currentLat && currentLon
      ? { latitude: currentLat, longitude: currentLon, radiusKm }
      : { latitude: 0, longitude: 0, radiusKm },
    { enabled: !!currentLat && !!currentLon && isTracking && shareLocationPref }
  );

  // Filter walkers by breed and size
  const filteredWalkers = activeWalkers?.filter((walker: any) => {
    if (filters.breed && walker.dogs?.[0]?.breed !== filters.breed) return false;
    if (filters.size && walker.dogs?.[0]?.size !== filters.size) return false;
    return true;
  }) || [];

  // Refetch walkers every 10 seconds when tracking
  useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      refetchWalkers();
    }, 10000);
    return () => clearInterval(interval);
  }, [isTracking, refetchWalkers]);

  // Update markers on map with dog photos
  useEffect(() => {
    if (!map || !activeWalkers) return;

    // Clear old markers
    markers.forEach(marker => marker.remove());
    setMarkers([]);

    // Create markers with dog photos
    const createMarkersWithPhotos = async () => {
      const newMarkers: maplibregl.Marker[] = [];

      for (const walker of filteredWalkers) {
        if (!walker.latitude || !walker.longitude) continue;

        let favoriteDogPhotoUrl: string | undefined = undefined;
        let favoriteDogName = 'Chien';
        let markerId = `${walker.id}-no-dog`;

        if (walker.dogs && Array.isArray(walker.dogs) && walker.dogs.length > 0) {
          const dogWithPhoto = walker.dogs.find((d: any) => {
            const urls = parsePhotoUrls(d.photoUrls);
            return urls.length > 0 && urls[0];
          });

          if (dogWithPhoto) {
            const urls = parsePhotoUrls(dogWithPhoto.photoUrls);
            favoriteDogPhotoUrl = urls[0] || undefined;
            favoriteDogName = dogWithPhoto.name;
            markerId = `${walker.id}-${dogWithPhoto.id}`;
          } else {
            favoriteDogName = walker.dogs[0].name;
            markerId = `${walker.id}-${walker.dogs[0].id}`;
          }
        }

        // Get or create marker icon DataURL
        let iconUrl = markerIconsRef.current.get(markerId);
        if (!iconUrl) {
          try {
            iconUrl = await createDogMarkerIcon({
              photoUrl: favoriteDogPhotoUrl,
              dogName: favoriteDogName,
              ownerName: walker.name || 'Maître',
              size: 40,
            });
            markerIconsRef.current.set(markerId, iconUrl);
          } catch (error) {
            console.warn('[WalkingMap] Failed to create marker icon:', error);
            iconUrl = getDefaultMarkerIcon();
          }
        }

        // Create DOM element for MapLibre Marker
        const el = document.createElement("div");
        el.className = "cursor-pointer hover:scale-110 transition-transform";
        el.style.width = "50px";
        el.style.height = "50px";
        el.style.backgroundImage = `url(${iconUrl})`;
        el.style.backgroundSize = "contain";
        el.style.backgroundPosition = "center";
        el.style.backgroundRepeat = "no-repeat";

        // Info popup
        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 text-black">
            <h3 class="font-bold">${walker.name || 'Maître'}</h3>
            <p class="text-sm">${favoriteDogName}</p>
            <p class="text-xs text-gray-600">${walker.age || '?'} ans</p>
          </div>
        `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([walker.longitude, walker.latitude])
          .setPopup(popup)
          .addTo(map);

        newMarkers.push(marker);
      }

      setMarkers(newMarkers);
    };

    createMarkersWithPhotos();
  }, [map, filteredWalkers, activeWalkers]);

  // Add current user marker
  useEffect(() => {
    if (!map || !currentLat || !currentLon) return;

    if (userMarker) userMarker.remove();

    const el = document.createElement("div");
    el.className = "w-5 h-5 bg-indigo-600 rounded-full border-2 border-white ring-4 ring-indigo-900/30 animate-pulse shadow-md";

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([currentLon, currentLat])
      .addTo(map);

    setUserMarker(marker);

    return () => {
      marker.remove();
    };
  }, [map, currentLat, currentLon]);

  // Helper to create GeoJSON circle geometry (for privacy circle)
  const createGeoJSONCircle = (center: [number, number], radiusInKm: number, points: number = 64) => {
    const coords = {
      latitude: center[1],
      longitude: center[0]
    };

    const km = radiusInKm;
    const ret: [number, number][] = [];
    const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
    const distanceY = km / 110.57;

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI);
      const x = distanceX * Math.cos(theta);
      const y = distanceY * Math.sin(theta);
      ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]); // close the loop

    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [ret]
      },
      properties: {}
    };
  };

  // Add home marker & privacy circle
  useEffect(() => {
    if (!map || !homeLat || !homeLon) return;

    if (homeMarker) homeMarker.remove();

    // Create home pin DOM element
    const el = document.createElement("div");
    el.className = "w-4 h-4 bg-emerald-500 rounded-full border-2 border-white ring-2 ring-emerald-900/20 shadow-md";

    const newHomeMarker = new maplibregl.Marker({ element: el })
      .setLngLat([homeLon, homeLat])
      .addTo(map);

    setHomeMarker(newHomeMarker);

    // Draw Privacy zone circle in MapLibre GL layer
    const sourceId = "privacy-zone-source";
    const layerId = "privacy-zone-layer";
    const fillLayerId = "privacy-zone-fill";

    // Add source and layers
    const circleData = createGeoJSONCircle([homeLon, homeLat], 0.2); // 200 meters = 0.2 km

    map.addSource(sourceId, {
      type: "geojson",
      data: circleData
    });

    map.addLayer({
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#10B981",
        "fill-opacity": 0.1
      }
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#10B981",
        "line-opacity": 0.3,
        "line-width": 1.5
      }
    });

    return () => {
      newHomeMarker.remove();
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, homeLat, homeLon]);

  // Center map on current location
  useEffect(() => {
    if (!map || !currentLat || !currentLon) return;
    map.setCenter([currentLon, currentLat]);
  }, [map, currentLat, currentLon]);

  return (
    <div className="min-h-screen bg-background">
      {/* Privacy Alert Dialog */}
      <Dialog open={hasAskedAboutPrivacy} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Protection de votre vie privée
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Vous êtes à {Math.round(distanceToHome || 0)}m de votre domicile. Voulez-vous désactiver le partage de votre position pour protéger votre vie privée ?
            </p>
            <div className="flex gap-2">
              <Button
                onClick={confirmPrivacyStop}
                variant="default"
                className="flex-1 gap-2"
              >
                <Check className="w-4 h-4" />
                Désactiver
              </Button>
              <Button
                onClick={continueSharing}
                variant="outline"
                className="flex-1 gap-2"
              >
                <X className="w-4 h-4" />
                Continuer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-screen flex flex-col">
        {/* Map */}
        <div className="flex-1 relative">
          {/* Filters Panel */}
          <WalkingMapFilters
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
            onFilterChange={setFilters}
          />

          <MapView
            onMapReady={(mapInstance: maplibregl.Map) => {
              setMap(mapInstance);
              if (currentLat && currentLon) {
                mapInstance.setCenter([currentLon, currentLat]);
                mapInstance.setZoom(15);
              }

              // Handle setting home click
              mapInstance.on("click", (e) => {
                // If setting home mode is active
                if (settingHome) {
                  const { lat, lng } = e.lngLat;
                  setHomeLocation(lat, lng);
                  setSettingHome(false);
                }
              });
            }}
            className="w-full h-full"
          />
        </div>

        {/* Control Panel */}
        <div className="bg-background border-t-3 border-black p-4 md:p-6 space-y-4">
          {/* RGPD Opt-in Banner — shown when user has NOT enabled location sharing */}
          {!isShareEnabled && (
            <Card className="p-4 border-2 border-amber-500 bg-amber-50 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <EyeOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-black text-xs uppercase tracking-wider text-amber-900 mb-1">
                  🔒 Partage de position désactivé (RGPD)
                </h4>
                <p className="text-xs text-amber-800 font-semibold leading-relaxed mb-2">
                  Vous ne verrez pas les autres maîtres en balade sur la carte, et votre position ne leur est pas partagée. Activez le partage dans votre profil pour rejoindre la communauté.
                </p>
                <a
                  href="/profile"
                  className="inline-flex items-center gap-1 text-xs font-black text-amber-900 underline underline-offset-2 hover:text-amber-700"
                >
                  <Settings className="w-3 h-3" />
                  Activer dans mon profil →
                </a>
              </div>
            </Card>
          )}

          {/* Privacy Shield Info Card — always shown */}
          <Card className="p-4 border-2 border-black bg-blue-50/70 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-blue-950">Zone de Protection Confidentielle</h4>
              <p className="text-xs text-blue-900 mt-1 font-semibold leading-relaxed">
                Afin de garantir votre sécurité physique, votre position exacte est masquée dans un rayon de 200 mètres autour de votre domicile. Une position brouillée et approximative est montrée aux autres utilisateurs.
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Card */}
            <Card className="p-4 space-y-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold uppercase text-sm text-foreground">Statut du suivi</h3>
                <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} border border-black`} />
              </div>
              <div className="text-sm space-y-2 font-medium">
                <p>
                  <span className="text-muted-foreground">Position :</span>
                  {currentLat && currentLon ? (
                    <span className="ml-2 font-mono text-xs bg-muted px-1.5 py-0.5 border border-black rounded">{currentLat.toFixed(4)}, {currentLon.toFixed(4)}</span>
                  ) : (
                    <span className="ml-2 text-muted-foreground">Non disponible</span>
                  )}
                </p>
                {homeLat && homeLon && distanceToHome !== null && (
                  <p>
                    <span className="text-muted-foreground">Distance au domicile :</span>
                    <span className={`ml-2 font-bold ${isNearHome ? 'text-yellow-600' : 'text-green-600'}`}>
                      {Math.round(distanceToHome)}m
                    </span>
                  </p>
                )}
              </div>
            </Card>

            {/* Active Walkers Card */}
            <Card className="p-4 space-y-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
              <div className="flex items-center justify-between">
                <h3 className="font-bold uppercase text-sm text-foreground">Maîtres en balade</h3>
                <span className="text-xs font-black uppercase px-2 py-0.5 border-2 border-black rounded bg-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {activeWalkers?.length || 0}
                </span>
              </div>
              <div className="text-sm space-y-2 max-h-24 overflow-y-auto">
                {!isTracking ? (
                  <p className="text-muted-foreground text-xs font-medium">Démarrez votre balade pour chercher les autres maîtres</p>
                ) : !shareLocationPref ? (
                  <p className="text-muted-foreground text-xs font-medium">Mode privé activé (autres maîtres masqués)</p>
                ) : activeWalkers && activeWalkers.length > 0 ? (
                  activeWalkers.map((walker) => (
                    <div key={walker.id} className="flex items-center gap-2 p-2 border border-black bg-muted rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <MapPin className="w-4 h-4 text-primary" />
                      <div className="flex-1">
                        <p className="font-bold text-xs">{walker.name}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold">{walker.dogs?.[0]?.name || 'Chien'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-xs font-medium">Aucun maître actif à proximité</p>
                )}
              </div>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row gap-3 pt-1">
            {!isTracking ? (
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="shareLocationPref"
                    checked={shareLocationPref}
                    onChange={(e) => setShareLocationPref(e.target.checked)}
                    className="w-4 h-4 rounded border-black text-pink-500 focus:ring-pink-400"
                  />
                  <label htmlFor="shareLocationPref" className="text-xs font-bold text-foreground cursor-pointer select-none">
                    Partager ma position sur la map avec les autres maîtres
                  </label>
                </div>
                <Button
                  onClick={() => startTracking(shareLocationPref)}
                  className="w-full gap-2 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 border-2 border-black text-white font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase"
                >
                  <Navigation className="w-4 h-4" />
                  Démarrer la balade
                </Button>
              </div>
            ) : (
              <Button
                onClick={stopTracking}
                variant="destructive"
                className="flex-1 gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all font-bold uppercase"
              >
                <X className="w-4 h-4" />
                Arrêter le suivi
              </Button>
            )}

            {!homeLat || !homeLon ? (
              <Button
                onClick={() => setSettingHome(true)}
                variant="outline"
                className="flex-1 gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white font-bold uppercase"
              >
                <Home className="w-4 h-4" />
                Définir le domicile
              </Button>
            ) : (
              <Button
                onClick={() => setSettingHome(!settingHome)}
                variant="outline"
                className="flex-1 gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white font-bold uppercase"
              >
                <Home className="w-4 h-4" />
                {settingHome ? 'Annuler' : 'Modifier domicile'}
              </Button>
            )}
          </div>

          {settingHome && (
            <div className="p-3 bg-blue-50 border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs text-blue-900 font-bold uppercase">
                🎯 Cliquez sur la carte pour définir votre domicile
              </p>
            </div>
          )}

          {/* Radius Control */}
          <div className="space-y-2 pt-2">
            <label className="text-sm font-bold uppercase tracking-wide text-foreground">
              Rayon de recherche : {radiusKm} km
            </label>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
