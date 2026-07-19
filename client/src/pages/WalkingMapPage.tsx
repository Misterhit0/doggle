import { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useWalkingTracking } from '@/hooks/useWalkingTracking';
import { MapView } from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Navigation, Home, AlertCircle, Check, X, ShieldCheck, EyeOff, Settings, Star, AlertTriangle, MessageSquare, Heart, Clock, Award, ChevronDown, ChevronUp } from 'lucide-react';
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

  // Toggle control panel visibility on mobile/desktop
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  // Markers stored in refs to avoid React infinite re-render loops (error #185)
  const walkersMarkersRef = useRef<maplibregl.Marker[]>([]);
  const placesMarkersRef = useRef<maplibregl.Marker[]>([]);
  const vetsMarkersRef = useRef<maplibregl.Marker[]>([]);
  const dangersMarkersRef = useRef<maplibregl.Marker[]>([]);
  
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

  // Load walks and goals for KPIs
  const { data: walksList, refetch: refetchWalksList } = trpc.walks.getMyWalks.useQuery();
  const { data: currentGoals } = trpc.walks.getCurrentGoals.useQuery();

  const now = useMemo(() => new Date(), [isTracking]);
  const sevenDaysAgo = useMemo(() => new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), [now]);

  const weeklyMeters = useMemo(() => {
    return walksList
      ? walksList
          .filter(w => new Date(w.startedAt) >= sevenDaysAgo)
          .reduce((sum, w) => sum + w.distanceMeters, 0)
      : 0;
  }, [walksList, sevenDaysAgo]);

  const weeklySeconds = useMemo(() => {
    return walksList
      ? walksList
          .filter(w => new Date(w.startedAt) >= sevenDaysAgo)
          .reduce((sum, w) => sum + w.durationSeconds, 0)
      : 0;
  }, [walksList, sevenDaysAgo]);

  const distanceGoal = currentGoals?.find(g => g.goalType === "distance");
  const durationGoal = currentGoals?.find(g => g.goalType === "duration");

  const targetMeters = distanceGoal?.targetValue ?? 15000;
  const targetSeconds = durationGoal?.targetValue ?? 36000;

  const distPercent = Math.min(100, Math.round((weeklyMeters / targetMeters) * 100));
  const durPercent = Math.min(100, Math.round((weeklySeconds / targetSeconds) * 100));

  // Memoized filters to prevent unstable references causing loops
  const filteredWalkers = useMemo(() => {
    return activeWalkers?.filter((walker: any) => {
      if (filters.breed && walker.dogs?.[0]?.breed !== filters.breed) return false;
      if (filters.size && walker.dogs?.[0]?.size !== filters.size) return false;
      return true;
    }) || [];
  }, [activeWalkers, filters.breed, filters.size]);

  const filteredPlaces = useMemo(() => {
    return nearbyPlaces?.filter((place: any) => {
      if (filters.type && place.placeType !== filters.type) return false;
      return true;
    }) || [];
  }, [nearbyPlaces, filters.type]);

  // Refetch walkers and dangers
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

  // Update Walkers Markers
  useEffect(() => {
    if (!map) return;

    walkersMarkersRef.current.forEach(marker => marker.remove());
    walkersMarkersRef.current = [];

    const createMarkers = async () => {
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
      walkersMarkersRef.current = newMarkers;
    };

    createMarkers();
  }, [map, filteredWalkers]);

  // Update Places Markers
  useEffect(() => {
    if (!map) return;

    placesMarkersRef.current.forEach(m => m.remove());
    placesMarkersRef.current = [];

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

    placesMarkersRef.current = newMarkers;
  }, [map, filteredPlaces]);

  // Update Vet Markers
  useEffect(() => {
    if (!map || !nearbyVets) return;

    vetsMarkersRef.current.forEach(m => m.remove());
    vetsMarkersRef.current = [];

    const newMarkers = nearbyVets.map(vet => {
      const el = document.createElement('div');
      el.className = 'cursor-pointer hover:scale-110 transition-transform flex items-center justify-center w-8 h-8 rounded-full border-2 border-black bg-[#E6F4EA] shadow-[2px_2px_0px_rgba(0,0,0,1)]';
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

    vetsMarkersRef.current = newMarkers;
  }, [map, nearbyVets]);

  // Update Danger Markers
  useEffect(() => {
    if (!map || !activeDangers) return;

    dangersMarkersRef.current.forEach(m => m.remove());
    dangersMarkersRef.current = [];

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

    dangersMarkersRef.current = newMarkers;
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
      refetchWalksList();
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
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#FFFDF9] font-sans overflow-hidden">
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

      {/* Map occupies 100% of viewport */}
      <div className="absolute inset-0 w-full h-full z-0">
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

      {/* Floating Filters Button */}
      <WalkingMapFilters
        isOpen={filtersOpen}
        onToggle={() => setFiltersOpen(!filtersOpen)}
        onFilterChange={setFilters}
      />

      {/* Floating Warnings, Controls and KPIs Overlay (Desktop: Left, Mobile: Bottom) */}
      <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-10 flex flex-col gap-3 max-h-[85vh] overflow-y-auto pr-1">
        
        {/* Toggle Stats Card Button */}
        <Button
          onClick={() => setShowStatsPanel(!showStatsPanel)}
          className="w-full bg-black text-white hover:bg-gray-900 border-2 border-black font-black rounded-none shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase text-xs flex justify-between items-center py-2"
        >
          <span>📊 Tableau de Bord & Objectifs</span>
          {showStatsPanel ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </Button>

        {/* Collapsable KPIs and Warnings */}
        {showStatsPanel && (
          <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-200">
            {/* RGPD Disclaimer */}
            {!isShareEnabled && (
              <Card className="p-3 border-2 border-amber-500 bg-amber-50 flex items-start gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none">
                <EyeOff className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-black text-[10px] uppercase tracking-wider text-amber-900 mb-0.5">
                    🔒 RGPD Position désactivée
                  </h4>
                  <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
                    Activez le partage dans votre profil pour voir les autres maîtres et être visible.
                  </p>
                </div>
              </Card>
            )}

            {/* Privacy Zone Indicator */}
            <Card className="p-3 border-2 border-black bg-[#E6F4EA] flex items-start gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-[10px] uppercase tracking-wider text-emerald-950">Zone Confidentielle Active</h4>
                <p className="text-[9px] text-emerald-900 font-semibold leading-relaxed mt-0.5">
                  Votre position exacte est brouillée dans un rayon de 200m autour de votre domicile.
                </p>
              </div>
            </Card>

            {/* Detailed KPIs & Stats Panel */}
            <div className="grid grid-cols-2 gap-2">
              {/* Walkers Count */}
              <Card className="p-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white rounded-none">
                <h4 className="font-black uppercase text-[9px] text-gray-500 flex items-center gap-1 mb-1">
                  <Navigation className="w-3 h-3" /> Promeneurs
                </h4>
                <p className="text-lg font-black text-black">{activeWalkers?.length || 0}</p>
              </Card>

              {/* Dangers Count */}
              <Card className="p-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white rounded-none">
                <h4 className="font-black uppercase text-[9px] text-gray-500 flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3 text-rose-500" /> Dangers
                </h4>
                <p className="text-lg font-black text-rose-600">{activeDangers?.length || 0}</p>
              </Card>

              {/* Weekly Goals Progress */}
              <Card className="p-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white rounded-none col-span-2 space-y-2">
                <h4 className="font-black uppercase text-[10px] text-black flex items-center gap-1 border-b pb-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" /> Objectifs de la semaine
                </h4>
                <div className="text-[10px] font-semibold space-y-1.5">
                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span>Distance</span>
                      <span className="font-black text-pink-500">{(weeklyMeters / 1000).toFixed(1)} / {(targetMeters / 1000).toFixed(0)} km</span>
                    </div>
                    <div className="w-full h-2 border border-black bg-gray-100 p-0.5">
                      <div className="h-full bg-pink-500" style={{ width: `${distPercent}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span>Temps</span>
                      <span className="font-black text-pink-500">{(weeklySeconds / 3600).toFixed(1)} / {(targetSeconds / 3600).toFixed(0)} h</span>
                    </div>
                    <div className="w-full h-2 border border-black bg-gray-100 p-0.5">
                      <div className="h-full bg-pink-500" style={{ width: `${durPercent}%` }} />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Quick Main Action Card (Always visible, extremely compact) */}
        <Card className="p-3.5 border-2 border-black bg-[#FFFDF9] shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-none space-y-3">
          {isTracking && (
            <div className="flex justify-between items-center text-[10px] font-bold text-pink-500 bg-pink-50/50 border border-pink-200 px-2.5 py-1">
              <span className="flex items-center gap-1 animate-pulse">
                <Clock className="w-3 h-3" /> Balade en cours...
              </span>
              <span>{path.length} points GPS</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!isTracking ? (
              <div className="flex gap-2">
                <Button
                  onClick={() => startTracking(shareLocationPref)}
                  className="flex-1 gap-1.5 bg-pink-500 hover:bg-pink-600 border-2 border-black text-white font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all uppercase text-[10px] rounded-none py-2"
                >
                  <Navigation className="w-3.5 h-3.5" /> Démarrer
                </Button>
                <Button
                  onClick={() => setIsDangerReportOpen(true)}
                  className="bg-rose-500 hover:bg-rose-600 border-2 border-black text-white font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all uppercase text-[10px] rounded-none py-2 px-3"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Danger
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleStopTracking}
                  className="flex-1 gap-1.5 bg-rose-600 hover:bg-rose-700 border-2 border-black text-white font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all uppercase text-[10px] rounded-none py-2"
                >
                  <X className="w-3.5 h-3.5" /> Arrêter & Sauver
                </Button>
                <Button
                  onClick={() => setIsDangerReportOpen(true)}
                  className="bg-rose-500 hover:bg-rose-600 border-2 border-black text-white font-black shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all uppercase text-[10px] rounded-none py-2 px-3"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Danger
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setSettingHome(!settingHome)}
                className="flex-1 gap-1 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] bg-white text-black font-black uppercase text-[10px] rounded-none py-1.5"
              >
                <Home className="w-3 h-3" />
                {settingHome ? 'Annuler' : homeLat && homeLon ? 'Editer Domicile' : 'Domicile'}
              </Button>
              
              <div className="flex items-center gap-1.5 flex-1 px-1">
                <input
                  type="checkbox"
                  id="shareLocationPref"
                  checked={shareLocationPref}
                  onChange={(e) => setShareLocationPref(e.target.checked)}
                  className="w-3.5 h-3.5 border-2 border-black rounded-none text-pink-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="shareLocationPref" className="text-[9px] font-black text-foreground cursor-pointer select-none leading-none">
                  Partager position
                </label>
              </div>
            </div>
          </div>

          {settingHome && (
            <div className="p-2 bg-emerald-50 border border-emerald-500 rounded-none text-center">
              <p className="text-[9px] text-emerald-950 font-black uppercase tracking-wider">
                🎯 Cliquez sur la carte pour placer votre domicile
              </p>
            </div>
          )}

          {/* Compact Search Radius Slider */}
          <div className="space-y-1 border-t border-gray-100 pt-2">
            <div className="flex justify-between text-[10px] font-black uppercase text-gray-500">
              <span>Rayon de recherche</span>
              <span className="text-black">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(parseInt(e.target.value))}
              className="w-full h-1 bg-gray-200 appearance-none cursor-pointer accent-black"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function createGeoJSONCircle(center: [number, number], radiusInKm: number, points: number = 64) {
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
}
