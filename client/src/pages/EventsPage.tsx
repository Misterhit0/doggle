import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Plus, Map } from "lucide-react";
import { toast } from "sonner";
import { MapView } from "@/components/Map";
import maplibregl from "maplibre-gl";

const EVENT_TYPES = [
  "Dressage canin",
  "Balade de groupe",
  "Pique-nique canin",
  "Consultation vétérinaire",
  "Atelier photo",
  "Mentorat",
  "Socialisation",
  "Rencontre par race",
  "Yoga avec chiens",
  "Toilettage",
  "Collecte caritatif",
  "Échange de jouets",
  "Événement saisonnier",
  "Cinéma en plein air",
  "Marché fermier",
  "Atelier DIY",
  "Rencontre parents solo",
  "Séance de relaxation",
  "Concours de beauté",
  "Atelier comportement",
  "Nettoyage de parc",
];

const EVENT_TYPE_ICONS: Record<string, string> = {
  "Dressage canin": "🎯",
  "Balade de groupe": "🐾",
  "Pique-nique canin": "🧺",
  "Consultation vétérinaire": "🩺",
  "Atelier photo": "📸",
  "Mentorat": "🤝",
  "Socialisation": "🐕",
  "Rencontre par race": "🏆",
  "Yoga avec chiens": "🧘",
  "Toilettage": "✂️",
  "Collecte caritatif": "💝",
  "Échange de jouets": "🎾",
  "Événement saisonnier": "🎉",
  "Cinéma en plein air": "🎬",
  "Marché fermier": "🌿",
  "Atelier DIY": "🔨",
  "Rencontre parents solo": "👋",
  "Séance de relaxation": "😌",
  "Concours de beauté": "🌟",
  "Atelier comportement": "📚",
  "Nettoyage de parc": "♻️",
};

export default function EventsPage() {
  const { user } = useAuth();
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventType: "",
    location: "",
    eventDate: "",
    duration: 60,
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

  const createEventMutation = trpc.events.createEvent.useMutation();
  // Always load events — France-wide fallback (500km) if no geoloc yet
  const { data: nearbyEvents, isLoading: eventsLoading, refetch: refetchEvents } = trpc.events.getNearbyEvents.useQuery(
    latitude && longitude
      ? { latitude, longitude, radiusKm: 50, eventType: selectedEventType && selectedEventType !== "all" ? selectedEventType : undefined }
      : { latitude: 46.603354, longitude: 1.888334, radiusKm: 500, eventType: selectedEventType && selectedEventType !== "all" ? selectedEventType : undefined },
    { refetchOnWindowFocus: false }
  );
  const joinEventMutation = trpc.events.joinEvent.useMutation();

  // Helper: place all event markers on a given map instance
  const placeEventMarkersOnMap = useCallback((mapInstance: maplibregl.Map, events: any[]) => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (!Array.isArray(events) || events.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    events.forEach((event) => {
      if (!event.latitude || !event.longitude) return;

      const icon = EVENT_TYPE_ICONS[event.eventType] || "📍";
      const eventDate = new Date(event.eventDate).toLocaleDateString("fr-FR", {
        weekday: "short", day: "numeric", month: "short",
        hour: "2-digit", minute: "2-digit",
      });

      const el = document.createElement("div");
      el.style.cssText = "display:flex;align-items:center;justify-content:center;width:38px;height:38px;background:#f59e0b;border-radius:50%;border:2px solid #000;box-shadow:2px 2px 0 #000;font-size:20px;cursor:pointer;transition:transform .15s";
      el.innerText = icon;
      el.onmouseenter = () => { el.style.transform = "scale(1.15)"; };
      el.onmouseleave = () => { el.style.transform = "scale(1)"; };

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="font-family:sans-serif;max-width:220px;padding:6px">
          <div style="font-size:18px;margin-bottom:4px">${icon}</div>
          <h3 style="font-weight:900;font-size:14px;margin:0 0 4px;text-transform:uppercase;color:#000">${event.title}</h3>
          <p style="font-size:11px;color:#666;margin:0 0 6px">${event.eventType}</p>
          <div style="font-size:11px;margin-bottom:3px">📅 ${eventDate}</div>
          <div style="font-size:11px">📍 ${event.location}</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([Number(event.longitude), Number(event.latitude)])
        .setPopup(popup)
        .addTo(mapInstance);

      markersRef.current.push(marker);
      bounds.extend([Number(event.longitude), Number(event.latitude)]);
    });

    if (markersRef.current.length > 0) {
      mapInstance.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
    }
  }, []);

  // Re-place markers whenever data or map changes
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance || !nearbyEvents) return;
    placeEventMarkersOnMap(mapInstance, nearbyEvents as any[]);
  }, [map, nearbyEvents, placeEventMarkersOnMap]);

  // Handle user position marker
  useEffect(() => {
    if (!map || !latitude || !longitude) return;

    // Create user marker element
    const el = document.createElement("div");
    el.className = "w-4 h-4 bg-indigo-600 rounded-full border-2 border-white ring-2 ring-indigo-900 ring-offset-1 animate-pulse";

    const userMarker = new maplibregl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(map);

    if (markersRef.current.length === 0) {
      map.setCenter([longitude, latitude]);
      map.setZoom(13);
    }

    return () => {
      userMarker.remove();
    };
  }, [map, latitude, longitude]);

  const handleCreateEvent = async () => {
    if (!formData.title.trim()) { toast.error("Ajoutez un titre"); return; }
    if (!formData.description.trim()) { toast.error("Ajoutez une description"); return; }
    if (!formData.eventType) { toast.error("Choisissez un type d'événement"); return; }
    if (!formData.location.trim()) { toast.error("Indiquez le lieu"); return; }
    if (!formData.eventDate) { toast.error("Choisissez une date et heure"); return; }

    let lat = latitude ?? 46.603354;
    let lng = longitude ?? 1.888334;

    // Geocode address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location)}&countrycodes=fr&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        lat = parseFloat(data[0].lat);
        lng = parseFloat(data[0].lon);
      } else {
        toast.info("Adresse introuvable, utilisation de votre position actuelle.");
      }
    } catch (error) {
      console.error("Geocoding failed, falling back to current location", error);
    }

    try {
      await createEventMutation.mutateAsync({
        ...formData,
        latitude: lat,
        longitude: lng,
        eventDate: new Date(formData.eventDate),
        duration: parseInt(formData.duration.toString()),
      });
      toast.success("🎉 Événement créé !");
      setFormData({ title: "", description: "", eventType: "", location: "", eventDate: "", duration: 60 });
      setIsCreating(false);
      refetchEvents();
    } catch (error: any) {
      console.error("[EventsPage] createEvent error:", error);
      toast.error(error?.message || "Erreur lors de la création — réessayez");
    }
  };

  const handleJoinEvent = async (eventId: number) => {
    try {
      await joinEventMutation.mutateAsync({ eventId });
      toast.success("Vous avez rejoint l'événement !");
      refetchEvents();
    } catch (error) {
      toast.error("Erreur lors de l'inscription");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-1">ÉVÉNEMENTS</h1>
            <p className="text-muted-foreground">Découvrez les événements canins près de vous</p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase">
                <Plus size={20} /> Créer un événement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un événement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Titre" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                <Select value={formData.eventType} onValueChange={(value) => setFormData({ ...formData, eventType: value })}>
                  <SelectTrigger><SelectValue placeholder="Type d'événement" /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{EVENT_TYPE_ICONS[type]} {type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Lieu (adresse, parc...)" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                <Input type="datetime-local" value={formData.eventDate} onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })} />
                <Input type="number" placeholder="Durée (minutes)" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })} />
                <Button onClick={handleCreateEvent} className="w-full border-2 border-black font-bold" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? "Création..." : "Créer l'événement"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Map Section */}
        <div className="mb-8 rounded-2xl overflow-hidden border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" style={{ borderWidth: '3px' }}>
          <div className="bg-black px-4 py-2 flex items-center gap-2">
            <Map size={16} className="text-yellow-400" />
            <span className="text-white text-sm font-bold uppercase tracking-wider">Carte des Événements</span>
            <span className="ml-auto text-yellow-400 text-xs font-semibold">
              {Array.isArray(nearbyEvents) ? nearbyEvents.length : 0} événement{(Array.isArray(nearbyEvents) ? nearbyEvents.length : 0) > 1 ? "s" : ""} à proximité
            </span>
          </div>
          <MapView
            onMapReady={(mapInstance) => {
              mapRef.current = mapInstance;
              setMap(mapInstance);
              if (latitude && longitude) {
                mapInstance.setCenter([longitude, latitude]);
                mapInstance.setZoom(13);
              } else {
                mapInstance.setCenter([2.3522, 46.6]);
                mapInstance.setZoom(5);
              }
              // Place markers immediately if data already loaded
              if (nearbyEvents && Array.isArray(nearbyEvents)) {
                placeEventMarkersOnMap(mapInstance, nearbyEvents as any[]);
              }
            }}
            initialCenter={latitude && longitude ? { lat: latitude, lng: longitude } : { lat: 48.8566, lng: 2.3522 }}
            initialZoom={13}
            className="w-full h-[380px]"
          />
        </div>

        {/* Event Type Filter */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex-shrink-0">Filtrer :</span>
          <Select value={selectedEventType} onValueChange={setSelectedEventType}>
            <SelectTrigger className="w-full md:w-72 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🐾 Tous les événements</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>{EVENT_TYPE_ICONS[type]} {type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Events List */}
        {eventsLoading ? (
          <div className="text-center py-8 text-muted-foreground font-semibold">Chargement des événements...</div>
        ) : nearbyEvents && Array.isArray(nearbyEvents) && nearbyEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(nearbyEvents as any[]).map((event) => (
              <Card key={event.id} className="p-5 hover:shadow-xl transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px]">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl flex-shrink-0">{EVENT_TYPE_ICONS[event.eventType] || "📍"}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base text-foreground uppercase leading-tight">{event.title}</h3>
                      <span className="text-xs text-muted-foreground font-semibold">{event.eventType}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-accent flex-shrink-0" />
                      <span className="truncate text-xs">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-accent flex-shrink-0" />
                      <span className="text-xs font-semibold">
                        {new Date(event.eventDate).toLocaleDateString("fr-FR", {
                          weekday: "short", day: "numeric", month: "long",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleJoinEvent(event.id)}
                    className="w-full mt-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all font-bold uppercase text-xs"
                    disabled={joinEventMutation.isPending}
                  >
                    {joinEventMutation.isPending ? "Inscription..." : "Rejoindre l'événement"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🐾</div>
            <p className="text-muted-foreground mb-4 font-semibold text-lg">Aucun événement trouvé près de vous</p>
            <Button
              onClick={() => setIsCreating(true)}
              className="border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold uppercase"
            >
              Créer le premier événement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
