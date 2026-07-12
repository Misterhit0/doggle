import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import {
  Home,
  Dog,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Send,
  AlertCircle,
  Phone,
  CalendarDays,
  Euro,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────
function parsePhotoUrls(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function fmt(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending:   { label: "En attente", color: "bg-amber-100 text-amber-800 border-amber-400" },
  accepted:  { label: "Acceptée",   color: "bg-green-100 text-green-800 border-green-400" },
  rejected:  { label: "Refusée",    color: "bg-red-100 text-red-700 border-red-400" },
  completed: { label: "Terminée",   color: "bg-gray-100 text-gray-600 border-gray-300" },
};

// ── Tab type ─────────────────────────────────────────────────────────────────
type Tab = "proposals" | "boardings" | "profile";

export default function DogSitterDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("proposals");

  // Boarding queries
  const { data: availableDogs, isLoading: loadingDogs, refetch: refetchDogs } = trpc.boarding.getAvailableDogs.useQuery();
  const { data: sitterRequests, isLoading: loadingRequests, refetch: refetchRequests } = trpc.boarding.getSitterRequests.useQuery();
  const { data: activeBoardings } = trpc.boarding.getActiveBoardings.useQuery();

  // Mutations
  const registerMutation = trpc.boarding.registerAsSitter.useMutation({
    onSuccess: () => { toast.success("Demande envoyée ! Un admin va valider votre profil."); refetchProfile(); },
    onError: (e) => toast.error(e.message),
  });
  const updateProfileMutation = trpc.boarding.updateSitterProfile.useMutation({
    onSuccess: () => { toast.success("Profil mis à jour !"); refetchProfile(); },
    onError: (e) => toast.error(e.message),
  });
  const respondMutation = trpc.boarding.respondToRequest.useMutation({
    onSuccess: () => { toast.success("Réponse envoyée !"); refetchRequests(); },
    onError: (e) => toast.error(e.message),
  });
  const completeMutation = trpc.boarding.completeBoardng.useMutation({
    onSuccess: () => { toast.success("Garde marquée terminée !"); refetchRequests(); },
    onError: (e) => toast.error(e.message),
  });

  // Request form state (for sending a boarding request FROM the sitter TO an owner)
  const [requestForm, setRequestForm] = useState<{
    dogId: number; sitterId: number; startDate: string; endDate: string; message: string; open: boolean;
  } | null>(null);
  const requestBoardingMutation = trpc.boarding.requestBoarding.useMutation({
    onSuccess: () => { toast.success("Demande envoyée au propriétaire !"); setRequestForm(null); refetchDogs(); },
    onError: (e) => toast.error(e.message),
  });

  // Profile form
  const { data: myProfile, refetch: refetchProfile } = trpc.user.getProfile.useQuery();
  const [profileForm, setProfileForm] = useState({
    dogSitterBio: "",
    dogSitterRates: { night: 0, halfDay: 0, walk: 0 },
    dogSitterAvailable: false,
    dogSitterMaxDogs: 1,
    initialized: false,
  });

  // Init profile form from server data
  if (myProfile && !profileForm.initialized) {
    const rates = typeof myProfile.dogSitterRates === "string"
      ? JSON.parse(myProfile.dogSitterRates)
      : (myProfile.dogSitterRates ?? {});
    setProfileForm({
      dogSitterBio: myProfile.dogSitterBio ?? "",
      dogSitterRates: { night: rates?.night ?? 0, halfDay: rates?.halfDay ?? 0, walk: rates?.walk ?? 0 },
      dogSitterAvailable: !!myProfile.dogSitterAvailable,
      dogSitterMaxDogs: myProfile.dogSitterMaxDogs ?? 1,
      initialized: true,
    });
  }

  const isRegistered = myProfile?.isDogSitter;
  const sitterStatus = myProfile?.dogSitterStatus;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "proposals", label: "Propositions", icon: <Dog size={18} /> },
    { id: "boardings", label: "Mes gardes", icon: <Home size={18} /> },
    { id: "profile",   label: "Mon profil",  icon: <User size={18} /> },
  ];

  // ── Not a sitter yet — registration form ─────────────────────────────────
  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container max-w-2xl">
          <div className="mb-8 text-center">
            <div className="text-6xl mb-4">🐾</div>
            <h1 className="text-4xl font-black uppercase text-foreground mb-2">Devenir Dog-Sitter</h1>
            <p className="text-muted-foreground text-lg">Remplissez le formulaire, un admin validera votre profil sous 24h.</p>
          </div>

          <Card className="p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="space-y-6">
              <div>
                <Label htmlFor="sitter-bio" className="font-bold text-base mb-2 block">
                  À propos de vous (expérience, logement, disponibilités…)
                </Label>
                <Textarea
                  id="sitter-bio"
                  rows={5}
                  maxLength={800}
                  placeholder="Ex : J'ai 5 ans d'expérience avec les chiens, je vis dans une maison avec jardin, disponible week-ends et jours fériés…"
                  value={profileForm.dogSitterBio}
                  onChange={e => setProfileForm(prev => ({ ...prev, dogSitterBio: e.target.value }))}
                />
              </div>

              <div>
                <Label className="font-bold text-base mb-3 block">💰 Vos tarifs</Label>
                <div className="grid grid-cols-3 gap-4">
                  {(["night", "halfDay", "walk"] as const).map(k => (
                    <div key={k}>
                      <Label htmlFor={`rate-${k}`} className="text-sm text-muted-foreground mb-1 block">
                        {k === "night" ? "🌙 /nuit" : k === "halfDay" ? "☀️ /demi-journée" : "🦮 /promenade"}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`rate-${k}`}
                          type="number"
                          min={0}
                          max={k === "walk" ? 200 : 500}
                          value={profileForm.dogSitterRates[k] || ""}
                          onChange={e => setProfileForm(prev => ({ ...prev, dogSitterRates: { ...prev.dogSitterRates, [k]: Number(e.target.value) } }))}
                          className="pr-7 border-2 border-black"
                          placeholder="0"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="max-dogs" className="font-bold text-base mb-2 block">
                  Nombre maximum de chiens simultanés
                </Label>
                <Input
                  id="max-dogs"
                  type="number"
                  min={1}
                  max={10}
                  value={profileForm.dogSitterMaxDogs}
                  onChange={e => setProfileForm(prev => ({ ...prev, dogSitterMaxDogs: Number(e.target.value) }))}
                  className="w-28 border-2 border-black"
                />
              </div>

              <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex gap-3">
                <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Votre demande sera examinée par un administrateur. Vous recevrez une confirmation par email.
                </p>
              </div>

              <Button
                onClick={() => registerMutation.mutate({
                  dogSitterBio: profileForm.dogSitterBio,
                  dogSitterRates: profileForm.dogSitterRates,
                  dogSitterMaxDogs: profileForm.dogSitterMaxDogs,
                })}
                disabled={registerMutation.isPending}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-12 text-base"
              >
                {registerMutation.isPending ? "Envoi en cours…" : "Soumettre ma candidature 🐾"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Pending validation banner ─────────────────────────────────────────────
  const PendingBanner = sitterStatus === "pending" ? (
    <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex gap-3 items-center">
      <Clock size={20} className="text-amber-600 flex-shrink-0" />
      <p className="text-sm text-amber-800 font-semibold">
        Votre profil dog-sitter est <strong>en attente de validation</strong> par un administrateur.
        Certaines fonctionnalités seront disponibles après approbation.
      </p>
    </div>
  ) : sitterStatus === "approved" ? (
    <div className="mb-6 bg-green-50 border-2 border-green-400 rounded-xl p-4 flex gap-3 items-center">
      <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
      <p className="text-sm text-green-800 font-semibold">✅ Profil approuvé — vous pouvez accepter des chiens !</p>
    </div>
  ) : null;

  // ── Main dashboard ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase text-foreground mb-1">Dashboard Dog-Sitter</h1>
          <p className="text-muted-foreground">Gérez vos gardes et votre profil de gardien</p>
        </div>

        {PendingBanner}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-muted p-1 rounded-xl border-2 border-black">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm uppercase transition-all ${
                activeTab === tab.id
                  ? "bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab 1 : Propositions ── */}
        {activeTab === "proposals" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase">Chiens disponibles pour gardiennage</h2>
              <span className="text-sm text-muted-foreground bg-muted border border-black px-3 py-1 rounded-full">
                {availableDogs?.length ?? 0} chien{(availableDogs?.length ?? 0) > 1 ? "s" : ""}
              </span>
            </div>

            {loadingDogs ? (
              <div className="flex justify-center py-20"><Spinner /></div>
            ) : !availableDogs?.length ? (
              <div className="text-center py-20">
                <Dog size={64} className="mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground text-lg font-semibold">Aucun chien disponible pour le moment</p>
                <p className="text-muted-foreground text-sm mt-1">Les propriétaires peuvent activer l'option gardiennage sur la page "Mes Chiens"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {availableDogs.map((dog: any) => {
                  const photos = parsePhotoUrls(dog.photoUrls);
                  return (
                    <div key={dog.id} className="group">
                      <div className="relative h-72 rounded-2xl overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        {photos[0] ? (
                          <img src={photos[0]} alt={dog.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
                            <Dog size={48} className="text-amber-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Boarding badge */}
                        <div className="absolute top-3 left-3 bg-blue-400 text-white text-xs font-black px-2 py-1 rounded-full border border-white/40">
                          🏠 Gardiennage
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="text-2xl font-black">{dog.name}</h3>
                          <p className="text-sm text-white/80">
                            {[dog.breed, dog.age ? `${dog.age} ans` : null].filter(Boolean).join(" • ")}
                          </p>
                          <p className="text-xs text-white/70 mt-1">
                            Proprio : <span className="font-semibold">{dog.ownerName}</span>
                          </p>

                          <Button
                            onClick={() => setRequestForm({ dogId: dog.id, sitterId: (user as any)?.id, startDate: "", endDate: "", message: "", open: true })}
                            size="sm"
                            className="mt-3 w-full bg-white text-black hover:bg-white/90 font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs gap-2"
                            disabled={sitterStatus !== "approved"}
                          >
                            <Send size={12} />
                            {sitterStatus === "approved" ? "Demander à garder" : "Validation en attente"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Request form modal */}
            {requestForm && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
                  <h3 className="text-xl font-black uppercase mb-4">📅 Demande de garde</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Date de début</Label>
                        <Input type="date" value={requestForm.startDate} onChange={e => setRequestForm(prev => prev ? { ...prev, startDate: e.target.value } : null)} className="border-2 border-black" />
                      </div>
                      <div>
                        <Label>Date de fin</Label>
                        <Input type="date" value={requestForm.endDate} onChange={e => setRequestForm(prev => prev ? { ...prev, endDate: e.target.value } : null)} className="border-2 border-black" />
                      </div>
                    </div>
                    <div>
                      <Label>Message au propriétaire</Label>
                      <Textarea
                        placeholder="Présentez-vous, décrivez votre logement, posez vos questions…"
                        value={requestForm.message}
                        onChange={e => setRequestForm(prev => prev ? { ...prev, message: e.target.value } : null)}
                        maxLength={500}
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          if (!requestForm.startDate || !requestForm.endDate) {
                            toast.error("Veuillez saisir les dates"); return;
                          }
                          requestBoardingMutation.mutate({
                            dogId: requestForm.dogId,
                            sitterId: requestForm.sitterId,
                            startDate: requestForm.startDate,
                            endDate: requestForm.endDate,
                            message: requestForm.message,
                            ownerPhone: (user as any)?.phoneNumber,
                          });
                        }}
                        disabled={requestBoardingMutation.isPending}
                        className="flex-1 bg-accent hover:bg-accent/90 font-bold uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      >
                        {requestBoardingMutation.isPending ? "Envoi…" : "Envoyer"}
                      </Button>
                      <Button variant="outline" onClick={() => setRequestForm(null)} className="flex-1 border-2 border-black">
                        Annuler
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2 : Mes gardes ── */}
        {activeTab === "boardings" && (
          <div>
            {/* Active boardings */}
            {!!activeBoardings?.length && (
              <div className="mb-8">
                <h2 className="text-xl font-black uppercase mb-4 text-green-800">🏠 Chiens actuellement gardés</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeBoardings.map((b: any) => {
                    const photos = parsePhotoUrls(b.dogPhotoUrls);
                    return (
                      <Card key={b.id} className="border-2 border-green-400 shadow-[4px_4px_0px_0px_rgba(74,222,128,0.6)] p-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-black flex-shrink-0 bg-amber-100 flex items-center justify-center">
                            {photos[0] ? <img src={photos[0]} className="w-full h-full object-cover" alt={b.dogName} /> : <Dog size={24} className="text-amber-400" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-lg">{b.dogName}</p>
                            <p className="text-sm text-muted-foreground">{b.dogBreed} • Proprio : {b.ownerName}</p>
                            <p className="text-xs mt-1">📅 {fmt(b.startDate)} → {fmt(b.endDate)}</p>
                            {b.ownerPhone && (
                              <a href={`tel:${b.ownerPhone}`} className="flex items-center gap-1 text-xs text-blue-600 mt-1 font-semibold">
                                <Phone size={11} /> {b.ownerPhone}
                              </a>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => completeMutation.mutate({ requestId: b.id })}
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full border-2 border-black text-xs font-bold uppercase"
                        >
                          ✅ Marquer comme terminée
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All requests */}
            <h2 className="text-xl font-black uppercase mb-4">📋 Toutes les demandes reçues</h2>

            {loadingRequests ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : !sitterRequests?.length ? (
              <div className="text-center py-16">
                <Home size={56} className="mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-muted-foreground font-semibold">Aucune demande reçue pour l'instant</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sitterRequests.map((req: any) => {
                  const photos = parsePhotoUrls(req.dogPhotoUrls);
                  const s = statusLabel[req.status] ?? statusLabel.pending;
                  return (
                    <Card key={req.id} className="border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-5">
                      <div className="flex gap-4 items-start">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-black flex-shrink-0 bg-amber-100 flex items-center justify-center">
                          {photos[0] ? <img src={photos[0]} className="w-full h-full object-cover" alt={req.dogName} /> : <Dog size={24} className="text-amber-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-base">{req.dogName}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Proprio : {req.ownerName}</p>
                          <p className="text-xs mt-1 flex items-center gap-1">
                            <CalendarDays size={12} /> {fmt(req.startDate)} → {fmt(req.endDate)}
                          </p>
                          {req.ownerPhone && (
                            <a href={`tel:${req.ownerPhone}`} className="flex items-center gap-1 text-xs text-blue-600 mt-1 font-semibold">
                              <Phone size={11} /> {req.ownerPhone}
                            </a>
                          )}
                          {req.message && (
                            <p className="text-sm mt-2 bg-muted rounded-lg px-3 py-2 italic">"{req.message}"</p>
                          )}
                        </div>
                      </div>

                      {req.status === "pending" && (
                        <div className="flex gap-3 mt-4">
                          <Button
                            onClick={() => respondMutation.mutate({ requestId: req.id, status: "accepted" })}
                            disabled={respondMutation.isPending}
                            size="sm"
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] gap-1"
                          >
                            <CheckCircle size={14} /> Accepter
                          </Button>
                          <Button
                            onClick={() => respondMutation.mutate({ requestId: req.id, status: "rejected" })}
                            disabled={respondMutation.isPending}
                            size="sm"
                            variant="outline"
                            className="flex-1 border-2 border-red-400 text-red-600 hover:bg-red-50 font-bold uppercase gap-1"
                          >
                            <XCircle size={14} /> Refuser
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3 : Mon profil gardien ── */}
        {activeTab === "profile" && (
          <div>
            <h2 className="text-2xl font-black uppercase mb-6">Mon profil de gardien</h2>

            <Card className="p-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="space-y-6">
                {/* Availability toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl border-2 border-black bg-muted/30">
                  <div>
                    <p className="font-bold text-base">🟢 Disponible maintenant</p>
                    <p className="text-sm text-muted-foreground">Activez pour apparaître comme disponible aux propriétaires</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {profileForm.dogSitterAvailable ? "OUI" : "NON"}
                    </span>
                    <div
                      className={`w-12 h-6 rounded-full border-2 border-black transition-colors ${profileForm.dogSitterAvailable ? "bg-green-400" : "bg-gray-200"}`}
                      onClick={() => setProfileForm(prev => ({ ...prev, dogSitterAvailable: !prev.dogSitterAvailable }))}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white border-2 border-black mt-0.5 transition-transform ${profileForm.dogSitterAvailable ? "ml-6" : "ml-0.5"}`} />
                    </div>
                  </label>
                </div>

                {/* Bio */}
                <div>
                  <Label htmlFor="profile-bio" className="font-bold text-base mb-2 block">
                    Présentation / Bio
                  </Label>
                  <Textarea
                    id="profile-bio"
                    rows={5}
                    maxLength={800}
                    value={profileForm.dogSitterBio}
                    onChange={e => setProfileForm(prev => ({ ...prev, dogSitterBio: e.target.value }))}
                    placeholder="Décrivez votre expérience, votre logement, vos disponibilités…"
                  />
                </div>

                {/* Rates */}
                <div>
                  <Label className="font-bold text-base mb-3 block">💰 Tarifs</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {(["night", "halfDay", "walk"] as const).map(k => (
                      <div key={k}>
                        <Label htmlFor={`profile-rate-${k}`} className="text-sm text-muted-foreground mb-1 block">
                          {k === "night" ? "🌙 /nuit" : k === "halfDay" ? "☀️ /demi-journée" : "🦮 /promenade"}
                        </Label>
                        <div className="relative">
                          <Input
                            id={`profile-rate-${k}`}
                            type="number"
                            min={0}
                            max={k === "walk" ? 200 : 500}
                            value={profileForm.dogSitterRates[k] || ""}
                            onChange={e => setProfileForm(prev => ({ ...prev, dogSitterRates: { ...prev.dogSitterRates, [k]: Number(e.target.value) } }))}
                            className="pr-7 border-2 border-black"
                            placeholder="0"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rate preview */}
                  {Object.values(profileForm.dogSitterRates).some(v => v > 0) && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {profileForm.dogSitterRates.night > 0 && (
                        <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 border border-indigo-300 px-3 py-1 rounded-full text-sm font-bold">
                          🌙 {profileForm.dogSitterRates.night}€/nuit
                        </span>
                      )}
                      {profileForm.dogSitterRates.halfDay > 0 && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-full text-sm font-bold">
                          ☀️ {profileForm.dogSitterRates.halfDay}€/demi-j.
                        </span>
                      )}
                      {profileForm.dogSitterRates.walk > 0 && (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 border border-green-300 px-3 py-1 rounded-full text-sm font-bold">
                          🦮 {profileForm.dogSitterRates.walk}€/promenade
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Max dogs */}
                <div>
                  <Label htmlFor="max-dogs-profile" className="font-bold text-base mb-2 block">
                    Capacité max (chiens simultanés)
                  </Label>
                  <Input
                    id="max-dogs-profile"
                    type="number"
                    min={1}
                    max={10}
                    value={profileForm.dogSitterMaxDogs}
                    onChange={e => setProfileForm(prev => ({ ...prev, dogSitterMaxDogs: Number(e.target.value) }))}
                    className="w-28 border-2 border-black"
                  />
                </div>

                <Button
                  onClick={() => updateProfileMutation.mutate({
                    dogSitterBio: profileForm.dogSitterBio,
                    dogSitterRates: profileForm.dogSitterRates,
                    dogSitterAvailable: profileForm.dogSitterAvailable,
                    dogSitterMaxDogs: profileForm.dogSitterMaxDogs,
                  })}
                  disabled={updateProfileMutation.isPending}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-12 text-base"
                >
                  {updateProfileMutation.isPending ? "Enregistrement…" : "💾 Sauvegarder"}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
