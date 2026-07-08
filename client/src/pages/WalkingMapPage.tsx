import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useWalkingTracking } from '@/hooks/useWalkingTracking';
import { MapView } from '@/components/Map';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Navigation, Home, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import WalkingMapFilters from '@/components/WalkingMapFilters';
import { createDogMarkerIcon, getDefaultMarkerIcon } from '@/lib/dogMarkerUtils';

export default function WalkingMapPage() {
  const { user } = useAuth();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [homeMarker, setHomeMarker] = useState<google.maps.Marker | null>(null);
  const [settingHome, setSettingHome] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<{ breed?: string; size?: string }>({});
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

  // Get active walkers
  const { data: activeWalkers, refetch: refetchWalkers } = trpc.discovery.getActiveWalkers.useQuery(
    currentLat && currentLon
      ? { latitude: currentLat, longitude: currentLon, radiusKm }
      : { latitude: 0, longitude: 0, radiusKm },
    { enabled: !!currentLat && !!currentLon && isTracking }
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
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    // Create markers with dog photos
    const createMarkersWithPhotos = async () => {
      const newMarkers: google.maps.Marker[] = [];

      for (const walker of filteredWalkers) {
        if (!walker.latitude || !walker.longitude) continue;

        const dogName = walker.dogs?.[0]?.name || 'Chien';
        const photoUrls = walker.dogs?.[0]?.photoUrls;
        const photoUrl = photoUrls?.[0] || undefined;
        const markerId = `${walker.id}-${walker.dogs?.[0]?.id}`;

        // Get or create marker icon
        let iconUrl = markerIconsRef.current.get(markerId);
        if (!iconUrl) {
          try {
            iconUrl = await createDogMarkerIcon({
              photoUrl: photoUrl || undefined,
              dogName,
              ownerName: walker.name || 'Maître',
              size: 40,
            });
            markerIconsRef.current.set(markerId, iconUrl);
          } catch (error) {
            console.warn('[WalkingMap] Failed to create marker icon:', error);
            iconUrl = getDefaultMarkerIcon();
          }
        }

        const marker = new google.maps.Marker({
          position: { lat: walker.latitude, lng: walker.longitude },
          map,
          title: `${walker.name || 'Maître'} (${dogName})`,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(50, 50),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(25, 25),
          },
        });

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-bold">${walker.name || 'Maître'}</h3>
              <p class="text-sm">${dogName}</p>
              <p class="text-xs text-gray-600">${walker.age || '?'} ans</p>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
      }

      setMarkers(newMarkers);
    };

    createMarkersWithPhotos();
  }, [map, filteredWalkers]);

  // Add current user marker
  useEffect(() => {
    if (!map || !currentLat || !currentLon) return;

    const userMarker = new google.maps.Marker({
      position: { lat: currentLat, lng: currentLon },
      map,
      title: 'Vous',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4F46E5',
        fillOpacity: 0.9,
        strokeColor: '#312E81',
        strokeWeight: 2,
      },
    });

    return () => userMarker.setMap(null);
  }, [map, currentLat, currentLon]);

  // Add home marker
  useEffect(() => {
    if (!map || !homeLat || !homeLon) return;

    if (homeMarker) homeMarker.setMap(null);

    const newHomeMarker = new google.maps.Marker({
      position: { lat: homeLat, lng: homeLon },
      map,
      title: 'Domicile',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#10B981',
        fillOpacity: 0.7,
        strokeColor: '#047857',
        strokeWeight: 2,
      },
    });

    // Draw privacy radius circle
    const circle = new google.maps.Circle({
      center: { lat: homeLat, lng: homeLon },
      radius: 200, // 200 meters
      map,
      fillColor: '#10B981',
      fillOpacity: 0.1,
      strokeColor: '#10B981',
      strokeOpacity: 0.3,
      strokeWeight: 1,
    });

    setHomeMarker(newHomeMarker);

    return () => {
      newHomeMarker.setMap(null);
      circle.setMap(null);
    };
  }, [map, homeLat, homeLon]);

  // Center map on current location
  useEffect(() => {
    if (!map || !currentLat || !currentLon) return;
    map.setCenter({ lat: currentLat, lng: currentLon });
  }, [map, currentLat, currentLon]);

  // Handle setting home location by clicking on map
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!settingHome || !e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setHomeLocation(lat, lng);
    setSettingHome(false);
  };

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
        <div className="flex-1 relative" onClick={(e) => {
          if (settingHome && map) {
            const bounds = map.getBounds();
            if (bounds) {
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              const latRange = ne.lat() - sw.lat();
              const lngRange = ne.lng() - sw.lng();
              const clickLat = sw.lat() + (latRange * (e.clientY / (e.currentTarget as HTMLElement).offsetHeight));
              const clickLng = sw.lng() + (lngRange * (e.clientX / (e.currentTarget as HTMLElement).offsetWidth));
              setHomeLocation(clickLat, clickLng);
              setSettingHome(false);
            }
          }
        }}>
          {/* Filters Panel */}
          <WalkingMapFilters
            isOpen={filtersOpen}
            onToggle={() => setFiltersOpen(!filtersOpen)}
            onFilterChange={setFilters}
          />

          <MapView
            onMapReady={(mapInstance: google.maps.Map) => {
              setMap(mapInstance);
              if (currentLat && currentLon) {
                mapInstance.setCenter({ lat: currentLat, lng: currentLon });
                mapInstance.setZoom(15);
              }
            }}
            className="w-full h-full"
          />
        </div>

        {/* Control Panel */}
        <div className="bg-background border-t-3 border-black p-4 md:p-6 space-y-4">
          {/* Privacy Shield Info Card */}
          <Card className="p-4 border-2 border-black bg-blue-50/70 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
                {activeWalkers && activeWalkers.length > 0 ? (
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
              <Button
                onClick={startTracking}
                className="flex-1 gap-2 bg-gradient-to-r from-pink-400 to-pink-500 hover:from-pink-500 hover:to-pink-600 border-2 border-black text-white font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase"
              >
                <Navigation className="w-4 h-4" />
                Démarrer la balade
              </Button>
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
