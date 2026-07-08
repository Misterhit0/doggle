import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, MapPin, Phone, Heart, Plus, Clock, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import MemphisBackground from "@/components/MemphisBackground";

export default function LostDogsPage() {
  const { user } = useAuth();
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);
  const [isSighting, setIsSighting] = useState(false);
  const [formData, setFormData] = useState({
    dogId: 0,
    description: "",
    lostDate: "",
    lostLocation: "",
    reward: "",
    contactPhone: "",
  });
  const [sightingData, setSightingData] = useState({
    lostDogId: 0,
    location: "",
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

  const reportLostDogMutation = trpc.lostDogs.reportLostDog.useMutation();
  const reportSightingMutation = trpc.lostDogs.reportSighting.useMutation();
  const { data: userDogs } = trpc.dog.getMyDogs.useQuery(undefined);
  const { data: nearbyLostDogs, refetch: refetchLostDogs } = trpc.lostDogs.getNearbyLostDogs.useQuery(
    latitude && longitude ? { latitude, longitude, radiusKm: 25 } : { latitude: 0, longitude: 0 },
    { enabled: !!latitude && !!longitude }
  );
  const { data: sightings, refetch: refetchSightings } = trpc.lostDogs.getSightings.useQuery(
    selectedDogId ? { lostDogId: selectedDogId } : { lostDogId: 0 },
    { enabled: !!selectedDogId }
  );

  const handleReportLostDog = async () => {
    if (!latitude || !longitude) {
      toast.error("Géolocalisation requise");
      return;
    }

    if (!formData.dogId || !formData.description || !formData.lostDate || !formData.lostLocation) {
      toast.error("Remplissez tous les champs obligatoires");
      return;
    }

    try {
      await reportLostDogMutation.mutateAsync({
        dogId: formData.dogId,
        description: formData.description,
        lostDate: new Date(formData.lostDate),
        lostLocation: formData.lostLocation,
        latitude,
        longitude,
        reward: formData.reward || undefined,
        contactPhone: formData.contactPhone || undefined,
      });
      toast.success("Chien signalé comme perdu !");
      setFormData({ dogId: 0, description: "", lostDate: "", lostLocation: "", reward: "", contactPhone: "" });
      setIsReporting(false);
      refetchLostDogs();
    } catch (error) {
      toast.error("Erreur lors du signalement");
    }
  };

  const handleReportSighting = async () => {
    if (!latitude || !longitude) {
      toast.error("Géolocalisation requise");
      return;
    }

    if (!sightingData.lostDogId || !sightingData.location || !sightingData.sightingDate || !sightingData.description) {
      toast.error("Remplissez tous les champs");
      return;
    }

    try {
      await reportSightingMutation.mutateAsync({
        lostDogId: sightingData.lostDogId,
        location: sightingData.location,
        latitude,
        longitude,
        sightingDate: new Date(sightingData.sightingDate),
        description: sightingData.description,
        confidence: sightingData.confidence,
      });
      toast.success("Signalement de repérage envoyé !");
      setSightingData({ lostDogId: 0, location: "", sightingDate: "", description: "", confidence: "likely" });
      setIsSighting(false);
      refetchSightings();
    } catch (error) {
      toast.error("Erreur lors du signalement");
    }
  };

  const urgentDogs = (nearbyLostDogs as any[])?.filter(dog => {
    const lostDate = new Date(dog.lostDate);
    const now = new Date();
    const daysSinceLost = (now.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLost <= 7; // Urgent si perdu depuis moins de 7 jours
  }) || [];

  const recentDogs = (nearbyLostDogs as any[])?.filter(dog => {
    const lostDate = new Date(dog.lostDate);
    const now = new Date();
    const daysSinceLost = (now.getTime() - lostDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLost > 7;
  }) || [];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MemphisBackground />
      
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="mb-12">
            <div className="bg-gradient-to-r from-red-500 via-red-400 to-pink-400 rounded-3xl p-8 md:p-12 text-white border-4 border-black shadow-xl">
              <div className="flex items-start gap-4 mb-4">
                <AlertTriangle size={48} className="flex-shrink-0 animate-pulse" />
                <div>
                  <h1 className="text-5xl md:text-6xl font-black mb-2">CHIENS PERDUS</h1>
                  <p className="text-lg md:text-xl font-semibold">Aidez à retrouver les chiens perdus près de vous</p>
                </div>
              </div>
              <p className="text-sm md:text-base opacity-90 mt-4">
                ⏰ Chaque minute compte ! Signalez immédiatement et partagez avec votre communauté.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-12 flex-wrap">
            <Dialog open={isReporting} onOpenChange={setIsReporting}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-red-500 hover:bg-red-600 text-white font-bold text-lg px-6 py-6 h-auto border-2 border-black shadow-lg">
                  <Plus size={24} /> Signaler mon chien perdu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Signaler un chien perdu</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={formData.dogId.toString()} onValueChange={(value) => setFormData({ ...formData, dogId: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre chien" />
                    </SelectTrigger>
                    <SelectContent>
                      {userDogs?.map((dog) => (
                        <SelectItem key={dog.id} value={dog.id.toString()}>
                          {dog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Description détaillée du chien (couleur, signes distinctifs, etc.)"
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
                  <Input
                    placeholder="Lieu de disparition (rue, quartier, parc...)"
                    value={formData.lostLocation}
                    onChange={(e) => setFormData({ ...formData, lostLocation: e.target.value })}
                  />
                  <Input
                    placeholder="Récompense (optionnel)"
                    value={formData.reward}
                    onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                  />
                  <Input
                    placeholder="Téléphone de contact (optionnel)"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                  <Button onClick={handleReportLostDog} className="w-full bg-red-500 hover:bg-red-600 font-bold" disabled={reportLostDogMutation.isPending}>
                    {reportLostDogMutation.isPending ? "Signalement..." : "Signaler immédiatement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isSighting} onOpenChange={setIsSighting}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 font-bold text-lg px-6 py-6 h-auto border-2 border-black shadow-lg">
                  <Eye size={24} /> J'ai vu un chien
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Signaler un repérage</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={sightingData.lostDogId.toString()} onValueChange={(value) => setSightingData({ ...sightingData, lostDogId: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez le chien" />
                    </SelectTrigger>
                    <SelectContent>
                      {(nearbyLostDogs as any[])?.map((dog) => (
                        <SelectItem key={dog.id} value={dog.id.toString()}>
                          {dog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Lieu du repérage"
                    value={sightingData.location}
                    onChange={(e) => setSightingData({ ...sightingData, location: e.target.value })}
                  />
                  <Input
                    type="datetime-local"
                    value={sightingData.sightingDate}
                    onChange={(e) => setSightingData({ ...sightingData, sightingDate: e.target.value })}
                  />
                  <Textarea
                    placeholder="Description du repérage (où exactement, comportement, etc.)"
                    value={sightingData.description}
                    onChange={(e) => setSightingData({ ...sightingData, description: e.target.value })}
                    className="min-h-24"
                  />
                  <Select value={sightingData.confidence} onValueChange={(value) => setSightingData({ ...sightingData, confidence: value as any })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Certitude" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="certain">Certain (c'est lui !)</SelectItem>
                      <SelectItem value="likely">Probable (ressemble beaucoup)</SelectItem>
                      <SelectItem value="possible">Possible (pourrait être)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleReportSighting} className="w-full bg-green-500 hover:bg-green-600 font-bold" disabled={reportSightingMutation.isPending}>
                    {reportSightingMutation.isPending ? "Envoi..." : "Envoyer le signalement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Urgent Dogs Section */}
          {urgentDogs.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={28} className="text-red-600 animate-pulse" />
                <h2 className="text-3xl font-black text-red-600">🚨 URGENT (moins de 7 jours)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {urgentDogs.map((dog) => (
                  <Card key={dog.id} className="p-6 border-4 border-red-500 bg-red-50 hover:shadow-2xl transition-all transform hover:scale-105">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-black text-2xl text-red-700">{dog.name}</h3>
                        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">URGENT</span>
                      </div>
                      <p className="font-semibold text-sm text-gray-700">{dog.breed} - {dog.age} ans</p>
                      <p className="text-sm text-gray-800">{dog.description}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 font-semibold">
                          <MapPin size={18} className="text-red-600" />
                          <span>{dog.lostLocation}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock size={18} className="text-orange-600" />
                          <span>Disparu depuis {Math.round((new Date().getTime() - new Date(dog.lostDate).getTime()) / (1000 * 60 * 60 * 24))} jours</span>
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
                        onClick={() => {
                          setSelectedDogId(dog.id);
                          setIsSighting(true);
                        }}
                        className="w-full mt-4 bg-green-500 hover:bg-green-600 font-bold"
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
                {recentDogs.map((dog) => (
                  <Card key={dog.id} className="p-6 border-2 border-gray-300 hover:shadow-lg transition-shadow">
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg text-foreground">{dog.name}</h3>
                      <p className="text-sm text-muted-foreground">{dog.breed} - {dog.age} ans</p>
                      <p className="text-sm">{dog.description}</p>
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
                        onClick={() => {
                          setSelectedDogId(dog.id);
                          setIsSighting(true);
                        }}
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
