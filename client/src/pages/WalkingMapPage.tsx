import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useWalkingTracking } from '@/hooks/useWalkingTracking';
import { MapView } from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Navigation, Home, AlertCircle, Check, X, ShieldCheck, EyeOff, Settings, Star, AlertTriangle, MessageSquare, Heart, Clock } from 'lucide-react';
import { toast } from 'sonner';
import WalkingMapFilters from '@/components/WalkingMapFilters';
import { createDogMarkerIcon, getDefaultMarkerIcon } from '@/lib/dogMarkerUtils';
import maplibregl from 'maplibre-gl';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function WalkingMapPage() {
  const { user } = useAuth();
  const isShareEnabled = user?.isShareLocationActive;
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [markers, setMarkers] = useState<maplibregl.Marker[]>([]);
  const [placesMarkers, setPlacesMarkers] = useState<maplibregl.Marker[]>([]);
  const [vetsMarkers, setVetsMarkers] = useState<maplibregl.Marker[]>([]);
  const [dangersMarkers, setDangersMarkers] = useState<maplibregl.Marker[]>([]);
  
  const [userMarker, setUserMarker] = useState<maplibregl.Marker | null>(null);
  const [homeMarker, setHomeMarker] = useState<maplibregl.Marker | null>(null);
  const [settingHome, setSettingHome] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<{ breed?: string; size?: string; type?: string }>({});
  const [shareLocationPref, setShareLocationPref] = useState(false);
  const markerIconsRef = useRef<Map<string, string>>(new Map());

  // Interactive details state
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);
  const [isPlaceDetailsOpen, setIsPlaceDetailsOpen] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");

  const [selectedVet, setSelectedVet] = useState<any | null>(null);
  const [isVetDetailsOpen, setIsVetDetailsOpen] = useState(false);

  const [selectedDanger, setSelectedDanger] = useState<any | null>(null);
  const [isDangerDetailsOpen, setIsDangerDetailsOpen] = useState(false);

  const [isDangerReportOpen, setIsDangerReportOpen] = useState(false);
  const [dangerTitle, setDangerTitle] = useState("");
  const [dangerType, setDangerType] = useState<"cyanobacteria" | "hunting" | "glass" | "poison_bait" | "stray_dog" | "other">("other");
  const [dangerDesc, setDangerDesc] = useState("");

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const {
    isTracking,
    currentLat,
    currentLon,
    homeLat,
    homeLon,
    distanceToHome,
    isNearHome,
    hasAskedAboutPrivacy,
    path,
    startTracking,
    stopTracking,
    clearPathCache,
    confirmPrivacyStop,
    continueSharing,
    setHomeLocation,
  } = useWalkingTracking();

  // Mutations
  const reportDangerMutation = trpc.dangerAlerts.reportDanger.useMutation();
  const resolveDangerMutation = trpc.dangerAlerts.resolveDanger.useMutation();
  const addPlaceReviewMutation = trpc.dogFriendlyPlaces.addPlaceReview.useMutation();
  const syncWalkMutation = trpc.walks.syncWalk.useMutation();

  const parsePhotoUrls = (raw: any): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    try { return JSON.parse(raw); } catch { return []; }
  };

  // Get active walkers
  const { data: activeWalkers, refetch: refetchWalkers } = trpc.discovery.getActiveWalkers.useQuery(
    currentLat && currentLon
      ? { latitude: currentLat, longitude: currentLon, radiusKm }
      : { latitude: 0, longitude: 0, radiusKm },
    { enabled: !!currentLat && !!currentLon && isTracking && shareLocationPref }
  );

  // Load dog friendly places
  const { data: nearbyPlaces, refetch: refetchPlaces } = trpc.dogFriendlyPlaces.getNearbyPlaces.useQuery({
    latitude: currentLat || undefined,
    longitude: currentLon || undefined,
    radiusKm,
  });

  // Load vets
  const { data: nearbyVets } = trpc.vetAppointments.searchVets.useQuery({
    latitude: currentLat || undefined,
    longitude: currentLon || undefined,
    radiusKm,
  });

  // Load dangers
  const { data: activeDangers, refetch: refetchDangers } = trpc.dangerAlerts.getNearbyDangers.useQuery({
    latitude: currentLat || undefined,
    longitude: currentLon || undefined,
    radiusKm,
  });

  const filteredWalkers = activeWalkers?.filter((walker: any) => {
    if (filters.breed && walker.dogs?.[0]?.breed !== filters.breed) return false;
    if (filters.size && walker.dogs?.[0]?.size !== filters.size) return false;
    return true;
  }) || [];

  const filteredPlaces = nearbyPlaces?.filter((place: any) => {
    if (filters.type && place.placeType !== filters.type) return false;
    return true;
  }) || [];

  // Refetch walkers every 10 seconds when tracking
  useEffect(() => {
    if (!isTracking) return;
    const interval = setInterval(() => {
      refetchWalkers();
      refetchDangers();
    }, 10000);
    return () => clearInterval(interval);
  }, [isTracking, refetchWalkers, refetchDangers]);

  // Render live walk line layer
  useEffect(() => {
    if (!map) return;

    if (!isTracking || !path || path.length < 2) {
      if (map.getLayer('walk-path-layer')) map.removeLayer('walk-path-layer');
      if (map.getSource('walk-path-source')) map.removeSource('walk-path-source');
      return;
    }

    const coordinates = path.map(p => [p.lon, p.lat]);

    const geojson = {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates,
      },
    };

    if (map.getSource('walk-path-source')) {
      const source = map.getSource('walk-path-source') as maplibregl.GeoJSONSource;
      source.setData(geojson);
    } else {
      map.addSource('walk-path-source', {
        type: 'geojson',
        data: geojson,
      });

      map.addLayer({
        id: 'walk-path-layer',
        type: 'line',
        source: 'walk-path-source',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#F43F5E',
          'line-width': 5,
          'line-opacity': 0.8,
        },
      });
    }
  }, [map, isTracking, path]);

  // Create markers with dog photos (active walkers)
  useEffect(() => {
    if (!map || !activeWalkers) return;

    markers.forEach(marker => marker.remove());
    const newMarkers: maplibregl.Marker[] = [];

    const createMarkers = async () => {
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
            iconUrl = getDefaultMarkerIcon();
          }
        }

        const el = document.createElement("div");
        el.className = "cursor-pointer hover:scale-110 transition-transform";
        el.style.width = "50px";
        el.style.height = "50px";
        el.style.backgroundImage = `url(${iconUrl})`;
        el.style.backgroundSize = "contain";
        el.style.backgroundPosition = "center";
        el.style.backgroundRepeat = "no-repeat";

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 text-black">
            <h3 class="font-bold">${walker.name || 'Maître'}</h3>
            <p class="text-sm">${favoriteDogName}</p>
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

    createMarkers();
  }, [map, filteredWalkers, activeWalkers]);

  // Create / update Places markers
  useEffect(() => {
    if (!map || !nearbyPlaces) return;

    placesMarkers.forEach(m => m.remove());

    const newMarkers = filteredPlaces.map(place => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer hover:scale-110 transition-transform flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]';
      
      let emoji = '🌳';
      if (place.placeType === 'beach') emoji = '🏖️';
      else if (place.placeType === 'restaurant') emoji = '🍴';
      else if (place.placeType === 'hotel') emoji = '🏨';
      
      el.innerHTML = `<span class="text-base">${emoji}</span>`;
      
      el.addEventListener('click', () => {
        setSelectedPlace(place);
        setIsPlaceDetailsOpen(true);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([place.longitude, place.latitude])
        .addTo(map);

      return marker;
    });

    setPlacesMarkers(newMarkers);
  }, [map, filteredPlaces, nearbyPlaces]);

  // Create / update Vet markers
  useEffect(() => {
    if (!map || !nearbyVets) return;

    vetsMarkers.forEach(m => m.remove());

    const newMarkers = nearbyVets.map(vet => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer hover:scale-110 transition-transform flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-emerald-50 shadow-[2px_2px_0px_rgba(0,0,0,1)]';
      el.innerHTML = `<span class="text-base">🏥</span>`;
      
      el.addEventListener('click', () => {
        setSelectedVet(vet);
        setIsVetDetailsOpen(true);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([Number(vet.longitude), Number(vet.latitude)])
        .addTo(map);

      return marker;
    });

    setVetsMarkers(newMarkers);
  }, [map, nearbyVets]);

  // Create / update Danger markers
  useEffect(() => {
    if (!map || !activeDangers) return;

    dangersMarkers.forEach(m => m.remove());

    const newMarkers = activeDangers.map(danger => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer hover:scale-110 transition-transform flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-rose-50 shadow-[2px_2px_0px_rgba(0,0,0,1)] animate-bounce';
      el.innerHTML = `<span class="text-base">⚠️</span>`;
      
      el.addEventListener('click', () => {
        setSelectedDanger(danger);
        setIsDangerDetailsOpen(true);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([danger.longitude, danger.latitude])
        .addTo(map);

      return marker;
    });

    setDangersMarkers(newMarkers);
  }, [map, activeDangers]);

  // Add current user marker
  useEffect(() => {
    if (!map || !currentLat || !currentLon) return;

    if (userMarker) userMarker.remove();

    const el = document.createElement("div");
    el.className = "w-5 h-5 bg-pink-500 rounded-full border-2 border-black ring-4 ring-pink-500/20 animate-pulse shadow-md";

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([currentLon, currentLat])
      .addTo(map);

    setUserMarker(marker);

    return () => {
      marker.remove();
    };
  }, [map, currentLat, currentLon]);

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
    ret.push(ret[0]);

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

    const el = document.createElement("div");
    el.className = "w-4 h-4 bg-emerald-500 rounded-full border-2 border-black ring-2 ring-emerald-500/10 shadow-md";

    const newHomeMarker = new maplibregl.Marker({ element: el })
      .setLngLat([homeLon, homeLat])
      .addTo(map);

    setHomeMarker(newHomeMarker);

    const sourceId = "privacy-zone-source";
    const layerId = "privacy-zone-layer";
    const fillLayerId = "privacy-zone-fill";

    const circleData = createGeoJSONCircle([homeLon, homeLat], 0.2);

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

  useEffect(() => {
    if (!map || !currentLat || !currentLon) return;
    map.setCenter([currentLon, currentLat]);
  }, [map, currentLat, currentLon]);

  const handleStopTracking = () => {
    stopTracking();
    if (path.length >= 2) {
      setIsSyncModalOpen(true);
    }
  };

  const handleSyncWalk = async () => {
    if (path.length < 2) return;
    
    // Calculate total duration & distance
    const totalDist = path.reduce((acc, curr, idx) => {
      if (idx === 0) return acc;
      const prev = path[idx - 1];
      return acc + calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    }, 0);

    const totalDur = (path[path.length - 1].timestamp - path[0].timestamp) / 1000;

    try {
      await syncWalkMutation.mutateAsync({
        distanceMeter: Math.round(totalDist),
        durationSecond: Math.round(totalDur),
        gpsPath: path.map(p => ({ lat: p.lat, lng: p.lon, timestamp: p.timestamp })),
      });
      toast.success("Balade enregistrée et synchronisée avec succès !");
      clearPathCache();
      setIsSyncModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erreur de synchronisation");
    }
  };

  const handleReportDanger = async () => {
    if (!currentLat || !currentLon) {
      toast.error("Géolocalisation nécessaire pour signaler un danger");
      return;
    }

    try {
      await reportDangerMutation.mutateAsync({
        title: dangerTitle,
        type: dangerType,
        latitude: currentLat,
        longitude: currentLon,
        description: dangerDesc,
        expiresHours: 24,
      });
      toast.success("Danger signalé avec succès ! Les maîtres voisins seront notifiés.");
      setDangerTitle("");
      setDangerDesc("");
      setIsDangerReportOpen(false);
      refetchDangers();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du signalement");
    }
  };

  const handleResolveDanger = async (alertId: number) => {
    try {
      await resolveDangerMutation.mutateAsync({ alertId });
      toast.success("Alerte résolue et retirée de la carte.");
      setIsDangerDetailsOpen(false);
      refetchDangers();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la résolution");
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedPlace) return;
    try {
      await addPlaceReviewMutation.mutateAsync({
        placeId: selectedPlace.id,
        rating: newReviewRating,
        comment: newReviewComment,
      });
      toast.success("Avis déposé avec succès !");
      setNewReviewComment("");
      setIsPlaceDetailsOpen(false);
      refetchPlaces();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du dépôt d'avis");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] font-sans">
      <Dialog open={hasAskedAboutPrivacy} onOpenChange={() => {}}>
        <DialogContent className="max-w-md border-3 border-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-[#FFFDF9]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black text-xl text-black">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              PROTECTION VIE PRIVÉE
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-800">
              Vous êtes à {Math.round(distanceToHome || 0)}m de votre domicile. Voulez-vous masquer votre position exacte ?
            </p>
            <div className="flex gap-2">
              <Button onClick={confirmPrivacyStop} className="flex-1 bg-black text-white hover:bg-gray-900 font-bold border-2 border-black rounded-none">
                Masquer
              </Button>
              <Button onClick={continueSharing} className="flex-1 bg-white text-black hover:bg-gray-100 font-bold border-2 border-black rounded-none">
                Continuer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Walk Modal */}
      <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
        <DialogContent className="max-w-md border-3 border-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-[#FFFDF9]">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl uppercase tracking-wider">Sauvegarder la balade ?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <p className="text-sm font-semibold text-gray-700">
              Votre balade contient <span className="font-black text-pink-500">{path.length}</span> coordonnées GPS. Voulez-vous la synchroniser et l'ajouter à vos objectifs hebdomadaires ?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={handleSyncWalk} className="bg-pink-500 hover:bg-pink-600 border-2 border-black text-white font-black rounded-none shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase">
              Sauvegarder
            </Button>
            <Button onClick={() => { clearPathCache(); setIsSyncModalOpen(false); }} className="bg-white hover:bg-gray-100 border-2 border-black text-black font-black rounded-none shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase">
              Ignorer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Danger Modal */}
      <Dialog open={isDangerReportOpen} onOpenChange={setIsDangerReportOpen}>
        <DialogContent className="max-w-md border-3 border-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-[#FFFDF9]">
          <DialogHeader>
            <DialogTitle className="font-black text-2xl uppercase tracking-wider text-rose-600">Signaler un Danger</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <label className="block text-xs font-black uppercase mb-1">Titre de l'alerte</label>
              <input value={dangerTitle} onChange={e => setDangerTitle(e.target.value)} placeholder="Ex: Cyanobactéries dans le lac" className="w-full p-2 border-2 border-black rounded-none bg-white font-bold" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1">Type de danger</label>
              <select value={dangerType} onChange={e => setDangerType(e.target.value as any)} className="w-full p-2 border-2 border-black rounded-none bg-white font-bold">
                <option value="cyanobacteria">🦠 Cyanobactéries</option>
                <option value="hunting">🏹 Chasse en cours</option>
                <option value="glass">🍾 Verre pilé</option>
                <option value="poison_bait">☠️ Appât empoisonné</option>
                <option value="stray_dog">🐕 Chien errant agressif</option>
                <option value="other">⚠️ Autre danger</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1">Description / Précisions</label>
              <textarea value={dangerDesc} onChange={e => setDangerDesc(e.target.value)} placeholder="Détails importants pour la communauté..." rows={3} className="w-full p-2 border-2 border-black rounded-none bg-white font-bold" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleReportDanger} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black border-2 border-black rounded-none shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase">
              Confirmer le signalement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Place Details Modal */}
      <Dialog open={isPlaceDetailsOpen} onOpenChange={setIsPlaceDetailsOpen}>
        <DialogContent className="max-w-md border-3 border-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-[#FFFDF9]">
          {selectedPlace && (
            <div className="space-y-4 font-sans">
              <div className="border-b-2 border-black pb-3">
                <h3 className="font-black text-2xl uppercase text-black">{selectedPlace.name}</h3>
                <span className="inline-block px-2.5 py-0.5 border-2 border-black rounded-full text-xs font-bold bg-amber-100 mt-2 capitalize">{selectedPlace.placeType}</span>
              </div>
              <div>
                <h4 className="font-black text-xs uppercase mb-1 text-gray-500">Adresse</h4>
                <p className="text-sm font-bold text-black">{selectedPlace.address || "Non renseignée"}</p>
              </div>
              {selectedPlace.description && (
                <div>
                  <h4 className="font-black text-xs uppercase mb-1 text-gray-500">Description</h4>
                  <p className="text-sm font-semibold text-gray-800">{selectedPlace.description}</p>
                </div>
              )}

              {/* Reviews section */}
              <div className="border-t-2 border-black pt-3">
                <h4 className="font-black text-sm uppercase mb-2 flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Avis Communauté
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                  {selectedPlace.reviews && selectedPlace.reviews.length > 0 ? (
                    selectedPlace.reviews.map((r: any) => (
                      <div key={r.id} className="p-2 border border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-black text-xs">{r.user?.name || "Membre"}</span>
                          <span className="flex items-center text-xs font-bold text-amber-500">
                            {r.rating} <Star className="w-3 h-3 fill-amber-500 ml-0.5" />
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 font-semibold">{r.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground font-semibold">Aucun avis pour l'instant. Soyez le premier !</p>
                  )}
                </div>

                {/* Add review form */}
                <div className="bg-white p-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] space-y-2">
                  <h5 className="text-xs font-black uppercase">Laisser un avis</h5>
                  <div className="flex gap-1 items-center">
                    {[1, 2, 3, 4, 5].map(num => (
                      <button key={num} onClick={() => setNewReviewRating(num)}>
                        <Star className={`w-4 h-4 ${num <= newReviewRating ? "fill-amber-500 text-amber-500" : "text-gray-300"}`} />
                      </button>
                    ))}
                  </div>
                  <input value={newReviewComment} onChange={e => setNewReviewComment(e.target.value)} placeholder="Votre commentaire..." className="w-full p-1.5 border border-black text-xs font-bold" />
                  <Button onClick={handleSubmitReview} size="sm" className="w-full bg-black text-white hover:bg-gray-900 border border-black font-bold text-xs uppercase py-1">
                    Envoyer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Vet Details Modal */}
      <Dialog open={isVetDetailsOpen} onOpenChange={setIsVetDetailsOpen}>
        <DialogContent className="max-w-md border-3 border-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-[#FFFDF9]">
          {selectedVet && (
            <div className="space-y-4">
              <div className="border-b-2 border-black pb-3">
                <h3 className="font-black text-2xl text-emerald-950 flex items-center gap-2">🏥 {selectedVet.name}</h3>
                <p className="text-xs font-black text-emerald-800 uppercase tracking-wider mt-1">{selectedVet.specialty || "Vétérinaire généraliste"}</p>
              </div>
              <div className="space-y-2 text-sm font-semibold">
                <p><span className="text-gray-500 uppercase text-xs font-black block">Clinique</span> {selectedVet.clinicName || "Cabinet médical"}</p>
                <p><span className="text-gray-500 uppercase text-xs font-black block">Adresse</span> {selectedVet.address || "Non renseignée"}</p>
                <p><span className="text-gray-500 uppercase text-xs font-black block">Téléphone</span> {selectedVet.phoneNumber || "Non disponible"}</p>
              </div>

              <div className="border-t-2 border-black pt-3">
                {selectedVet.isPartner ? (
                  <div className="space-y-3">
                    <div className="bg-emerald-50 border-2 border-emerald-500 p-3 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <p className="text-xs font-black text-emerald-900">Clinique partenaire — Réservation directe Doctolib disponible</p>
                    </div>
                    <a href="/pet-health" className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-black border-2 border-black rounded-none py-2 shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase text-xs">
                      Prendre rendez-vous en ligne
                    </a>
                  </div>
                ) : (
                  <div className="bg-amber-50 border-2 border-amber-500 p-3">
                    <p className="text-xs font-bold text-amber-900">Cette clinique n'est pas encore partenaire de réservation directe. Vous pouvez néanmoins planifier votre rendez-vous manuellement dans l'espace santé.</p>
                    <a href="/pet-health" className="block w-full text-center bg-black hover:bg-gray-900 text-white font-black border-2 border-black rounded-none py-2 mt-3 shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase text-xs">
                      Ajouter un rendez-vous manuel
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Danger Details Modal */}
      <Dialog open={isDangerDetailsOpen} onOpenChange={setIsDangerDetailsOpen}>
        <DialogContent className="max-w-md border-3 border-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-[#FFFDF9]">
          {selectedDanger && (
            <div className="space-y-4">
              <div className="border-b-2 border-black pb-3">
                <h3 className="font-black text-2xl text-rose-600 flex items-center gap-2">⚠️ ALETRE DANGER</h3>
                <p className="text-sm font-black text-black uppercase tracking-wider mt-1">{selectedDanger.title}</p>
              </div>
              <div className="space-y-2 text-sm font-semibold">
                <p><span className="text-gray-500 uppercase text-xs font-black block">Type de risque</span> {selectedDanger.type}</p>
                <p><span className="text-gray-500 uppercase text-xs font-black block">Description</span> {selectedDanger.description || "Aucune description supplémentaire fournie."}</p>
                <p><span className="text-gray-500 uppercase text-xs font-black block">Créée le</span> {new Date(selectedDanger.createdAt).toLocaleString()}</p>
              </div>

              {selectedDanger.userId === user?.id && (
                <div className="border-t-2 border-black pt-3">
                  <Button onClick={() => handleResolveDanger(selectedDanger.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-black font-black rounded-none uppercase">
                    Marquer comme résolu / retirer
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="h-screen flex flex-col">
        <div className="flex-1 relative">
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

              mapInstance.on("click", (e) => {
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

        <div className="bg-background border-t-3 border-black p-4 md:p-6 space-y-4">
          {!isShareEnabled && (
            <Card className="p-4 border-2 border-amber-500 bg-amber-50 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none">
              <EyeOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-black text-xs uppercase tracking-wider text-amber-900 mb-1">
                  🔒 Partage de position désactivé (RGPD)
                </h4>
                <p className="text-xs text-amber-800 font-semibold leading-relaxed mb-2">
                  Vous ne verrez pas les autres maîtres en balade sur la carte, et votre position ne leur est pas partagée. Activez le partage dans votre profil pour rejoindre la communauté.
                </p>
                <a href="/profile" className="inline-flex items-center gap-1 text-xs font-black text-amber-900 underline underline-offset-2 hover:text-amber-700">
                  <Settings className="w-3 h-3" /> Activer dans mon profil →
                </a>
              </div>
            </Card>
          )}

          <Card className="p-4 border-2 border-black bg-emerald-50/70 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider text-emerald-950">Zone de Protection Confidentielle</h4>
              <p className="text-xs text-emerald-900 mt-1 font-semibold leading-relaxed">
                Afin de garantir votre sécurité physique, votre position exacte est masquée dans un rayon de 200 mètres autour de votre domicile. Une position brouillée et approximative est montrée aux autres utilisateurs.
              </p>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Card */}
            <Card className="p-4 space-y-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                <h3 className="font-black uppercase text-xs text-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Statut du suivi
                </h3>
                <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'} border border-black`} />
              </div>
              <div className="text-xs space-y-2 font-semibold">
                <p>
                  <span className="text-muted-foreground">Position :</span>
                  {currentLat && currentLon ? (
                    <span className="ml-2 font-mono text-[10px] bg-muted px-1.5 py-0.5 border border-black rounded">{currentLat.toFixed(4)}, {currentLon.toFixed(4)}</span>
                  ) : (
                    <span className="ml-2 text-muted-foreground font-bold">Non disponible</span>
                  )}
                </p>
                {homeLat && homeLon && distanceToHome !== null && (
                  <p>
                    <span className="text-muted-foreground">Distance domicile :</span>
                    <span className={`ml-2 font-bold ${isNearHome ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {Math.round(distanceToHome)}m
                    </span>
                  </p>
                )}
                {isTracking && (
                  <p className="text-[10px] text-pink-500 font-bold animate-pulse">
                    Traceur GPS actif ({path.length} coordonnées stockées)
                  </p>
                )}
              </div>
            </Card>

            {/* Active Walkers Card */}
            <Card className="p-4 space-y-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                <h3 className="font-black uppercase text-xs text-foreground flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> Maîtres en balade
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 border-2 border-black rounded bg-pink-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  {activeWalkers?.length || 0}
                </span>
              </div>
              <div className="text-xs space-y-2 max-h-24 overflow-y-auto">
                {!isTracking ? (
                  <p className="text-muted-foreground text-[10px] font-bold">Démarrez votre balade pour chercher les autres maîtres</p>
                ) : !shareLocationPref ? (
                  <p className="text-muted-foreground text-[10px] font-bold">Mode privé activé (autres maîtres masqués)</p>
                ) : activeWalkers && activeWalkers.length > 0 ? (
                  activeWalkers.map((walker) => (
                    <div key={walker.id} className="flex items-center gap-2 p-1.5 border border-black bg-[#FFFDF9] rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <MapPin className="w-3.5 h-3.5 text-pink-500" />
                      <div className="flex-1">
                        <p className="font-black text-[10px]">{walker.name}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold">{walker.dogs?.[0]?.name || 'Chien'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-[10px] font-bold">Aucun maître actif à proximité</p>
                )}
              </div>
            </Card>

            {/* Dangers & POI Status Card */}
            <Card className="p-4 space-y-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white rounded-none">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                <h3 className="font-black uppercase text-xs text-foreground flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Lieux & Dangers
                </h3>
              </div>
              <div className="text-xs font-semibold space-y-1.5">
                <p className="flex justify-between">
                  <span>Dangers signalés :</span>
                  <span className="font-black text-rose-500">{activeDangers?.length || 0}</span>
                </p>
                <p className="flex justify-between">
                  <span>Lieux dog-friendly :</span>
                  <span className="font-black text-emerald-700">{nearbyPlaces?.length || 0}</span>
                </p>
              </div>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-1">
            {!isTracking ? (
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="shareLocationPref"
                    checked={shareLocationPref}
                    onChange={(e) => setShareLocationPref(e.target.checked)}
                    className="w-4 h-4 border-2 border-black rounded-none text-pink-500 focus:ring-0"
                  />
                  <label htmlFor="shareLocationPref" className="text-xs font-black text-foreground cursor-pointer select-none">
                    Partager ma position sur la map avec les autres maîtres
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => startTracking(shareLocationPref)}
                    className="flex-1 gap-2 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 border-2 border-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase rounded-none"
                  >
                    <Navigation className="w-4 h-4" /> Démarrer la balade
                  </Button>
                  <Button
                    onClick={() => setIsDangerReportOpen(true)}
                    className="bg-rose-500 hover:bg-rose-600 border-2 border-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase rounded-none"
                  >
                    <AlertTriangle className="w-4 h-4" /> Signaler Danger
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-1">
                <Button
                  onClick={handleStopTracking}
                  className="flex-1 gap-2 bg-rose-600 hover:bg-rose-700 text-white font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase rounded-none"
                >
                  <X className="w-4 h-4" /> Arrêter le suivi & Enregistrer
                </Button>
                <Button
                  onClick={() => setIsDangerReportOpen(true)}
                  className="bg-rose-500 hover:bg-rose-600 border-2 border-black text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase rounded-none"
                >
                  <AlertTriangle className="w-4 h-4" /> Signaler Danger
                </Button>
              </div>
            )}

            {!homeLat || !homeLon ? (
              <Button
                onClick={() => setSettingHome(true)}
                className="flex-1 gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white font-black uppercase rounded-none text-black hover:bg-gray-50"
              >
                <Home className="w-4 h-4" /> Définir le domicile
              </Button>
            ) : (
              <Button
                onClick={() => setSettingHome(!settingHome)}
                className="flex-1 gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white font-black uppercase rounded-none text-black hover:bg-gray-50"
              >
                <Home className="w-4 h-4" /> {settingHome ? 'Annuler' : 'Modifier domicile'}
              </Button>
            )}
          </div>

          {settingHome && (
            <div className="p-3 bg-emerald-50 border-2 border-black rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-xs text-emerald-950 font-black uppercase">
                🎯 Cliquez sur la carte pour définir votre domicile
              </p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="text-xs font-black uppercase tracking-wide text-foreground">
              Rayon de recherche : {radiusKm} km
            </label>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 appearance-none cursor-pointer accent-black"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
