import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Users, Plus } from "lucide-react";
import { toast } from "sonner";

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

export default function EventsPage() {
  const { user } = useAuth();
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
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
  const { data: nearbyEvents, isLoading: eventsLoading, refetch: refetchEvents } = trpc.events.getNearbyEvents.useQuery(
    latitude && longitude
      ? { latitude, longitude, radiusKm: 10, eventType: selectedEventType && selectedEventType !== "all" ? selectedEventType : undefined }
      : { latitude: 0, longitude: 0 },
    { enabled: !!latitude && !!longitude }
  );
  const joinEventMutation = trpc.events.joinEvent.useMutation();

  const handleCreateEvent = async () => {
    if (!latitude || !longitude) {
      toast.error("Géolocalisation requise");
      return;
    }

    if (!formData.title || !formData.description || !formData.eventType || !formData.location || !formData.eventDate) {
      toast.error("Remplissez tous les champs");
      return;
    }

    try {
      await createEventMutation.mutateAsync({
        ...formData,
        latitude,
        longitude,
        eventDate: new Date(formData.eventDate),
        duration: parseInt(formData.duration.toString()),
      });
      toast.success("Événement créé !");
      setFormData({ title: "", description: "", eventType: "", location: "", eventDate: "", duration: 60 });
      setIsCreating(false);
      refetchEvents();
    } catch (error) {
      toast.error("Erreur lors de la création");
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">ÉVÉNEMENTS</h1>
            <p className="text-muted-foreground">Découvrez les événements canins près de vous</p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={20} /> Créer un événement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un événement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Titre"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <Select value={formData.eventType} onValueChange={(value) => setFormData({ ...formData, eventType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type d'événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Lieu"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
                <Input
                  type="datetime-local"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder="Durée (minutes)"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                />
                <Button onClick={handleCreateEvent} className="w-full" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? "Création..." : "Créer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Event Type Filter */}
        <div className="mb-6">
          <Select value={selectedEventType} onValueChange={setSelectedEventType}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Filtrer par type" />
            </SelectTrigger>
            <SelectContent>
                  <SelectItem value="all">Tous les événements</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Events List */}
        {eventsLoading ? (
          <div className="text-center py-8">Chargement des événements...</div>
        ) : nearbyEvents && Array.isArray(nearbyEvents) && nearbyEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(nearbyEvents as any[]).map((event) => (
              <Card key={event.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-foreground">{event.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-accent" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-accent" />
                      <span>{new Date(event.eventDate).toLocaleDateString("fr-FR")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-accent" />
                      <span>{event.eventType}</span>
                    </div>
                  </div>
                  <Button onClick={() => handleJoinEvent(event.id)} className="w-full mt-4" disabled={joinEventMutation.isPending}>
                    {joinEventMutation.isPending ? "Inscription..." : "Rejoindre"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Aucun événement trouvé près de vous</p>
            <Button onClick={() => setIsCreating(true)}>Créer le premier événement</Button>
          </div>
        )}
      </div>
    </div>
  );
}
