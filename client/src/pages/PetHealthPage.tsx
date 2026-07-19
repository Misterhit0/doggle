import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Heart, Activity, FileText, Calendar, ShieldCheck, Plus, Trash2, Clock, Check, AlertCircle } from "lucide-react";

export default function PetHealthPage() {
  const { data: myDogs, isLoading: isDogsLoading } = trpc.dog.getMyDogs.useQuery();
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);

  // Active dog ID helper
  const activeDogId = selectedDogId || (myDogs && myDogs.length > 0 ? myDogs[0].id : null);

  // Health Queries
  const { data: healthRecord, refetch: refetchHealth } = trpc.petHealth.getHealthRecord.useQuery(
    { dogId: activeDogId! },
    { enabled: !!activeDogId }
  );

  const { data: vaccines, refetch: refetchVaccines } = trpc.petHealth.getVaccines.useQuery(
    { dogId: activeDogId! },
    { enabled: !!activeDogId }
  );

  const { data: documents, refetch: refetchDocs } = trpc.petHealth.getDocuments.useQuery(
    { dogId: activeDogId! },
    { enabled: !!activeDogId }
  );

  // Search Vets
  const { data: nearbyVets } = trpc.vetAppointments.searchVets.useQuery({ radiusKm: 25 });

  // Mutations
  const upsertHealthRecordMutation = trpc.petHealth.upsertHealthRecord.useMutation();
  const addVaccineMutation = trpc.petHealth.addVaccine.useMutation();
  const addDocumentMutation = trpc.petHealth.addDocument.useMutation();
  const uploadFileMutation = trpc.storage.uploadPhoto.useMutation(); // Reuses base64 uploader

  // Booking state
  const [bookingVetId, setBookingVetId] = useState<number | null>(null);
  const [customVetName, setCustomVetName] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const bookAppointmentMutation = trpc.vetAppointments.bookAppointment.useMutation();

  // Add vaccine state
  const [vacName, setVacName] = useState("");
  const [vacAdminDate, setVacAdminDate] = useState("");
  const [vacNextDate, setVacNextDate] = useState("");

  // Add document state
  const [docNameInput, setDocNameInput] = useState("");
  const [docTypeInput, setDocTypeInput] = useState<"prescription" | "certificate" | "other">("other");
  const [docUrlInput, setDocUrlInput] = useState("");

  // Update health state
  const [weightInput, setWeightInput] = useState("");
  const [allergiesInput, setAllergiesInput] = useState("");
  const [historyInput, setHistoryInput] = useState("");
  const [treatmentInput, setTreatmentInput] = useState("");

  const handleUpdateHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDogId) return;

    try {
      await upsertHealthRecordMutation.mutateAsync({
        dogId: activeDogId,
        weight: weightInput ? parseFloat(weightInput) : undefined,
        allergies: allergiesInput || undefined,
        medicalHistory: historyInput || undefined,
        treatmentInfo: treatmentInput || undefined,
      });
      toast.success("Carnet de santé mis à jour !");
      refetchHealth();
    } catch (err: any) {
      toast.error(err.message || "Erreur de mise à jour");
    }
  };

  const handleAddVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDogId || !vacName || !vacAdminDate || !vacNextDate) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    try {
      await addVaccineMutation.mutateAsync({
        dogId: activeDogId,
        name: vacName,
        administeredDate: new Date(vacAdminDate),
        nextBoosterDate: new Date(vacNextDate),
      });
      toast.success("Vaccin enregistré avec succès !");
      setVacName("");
      setVacAdminDate("");
      setVacNextDate("");
      refetchVaccines();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        toast.loading("Upload du document...", { id: "upload-doc" });
        const res = await uploadFileMutation.mutateAsync({
          base64Data: base64,
          filename: file.name,
        });
        setDocUrlInput(res.url);
        toast.success("Fichier prêt !", { id: "upload-doc" });
      } catch (err: any) {
        toast.error(err.message || "Erreur d'upload", { id: "upload-doc" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDogId || !docNameInput || !docUrlInput) {
      toast.error("Veuillez charger un fichier et saisir un titre");
      return;
    }

    try {
      await addDocumentMutation.mutateAsync({
        dogId: activeDogId,
        documentName: docNameInput,
        documentUrl: docUrlInput,
        documentType: docTypeInput,
      });
      toast.success("Document médical archivé !");
      setDocNameInput("");
      setDocUrlInput("");
      refetchDocs();
    } catch (err: any) {
      toast.error(err.message || "Erreur d'enregistrement");
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDogId || !appointmentTime || !reason) {
      toast.error("Veuillez renseigner le créneau et le motif");
      return;
    }

    try {
      await bookAppointmentMutation.mutateAsync({
        dogId: activeDogId,
        vetId: bookingVetId || undefined,
        customVetName: bookingVetId ? undefined : customVetName,
        appointmentTime: new Date(appointmentTime),
        reason,
        notes: notes || undefined,
      });
      toast.success("Rendez-vous réservé ! Un rappel vous sera envoyé par e-mail et WhatsApp.");
      setCustomVetName("");
      setAppointmentTime("");
      setReason("");
      setNotes("");
      setBookingVetId(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur de réservation");
    }
  };

  if (isDogsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!myDogs || myDogs.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] py-12 px-6 flex flex-col items-center justify-center">
        <Card className="max-w-md p-8 border-3 border-black rounded-none shadow-[6px_6px_0px_rgba(0,0,0,1)] bg-white text-center">
          <Activity className="w-12 h-12 mx-auto text-rose-500 mb-4 animate-pulse" />
          <h2 className="text-xl font-black uppercase mb-2">Aucun chien enregistré</h2>
          <p className="text-gray-600 font-semibold mb-6">Ajoutez d'abord un chien dans votre profil pour pouvoir suivre sa santé et prendre des rendez-vous.</p>
          <a href="/profile" className="inline-block bg-black text-white hover:bg-gray-900 border-2 border-black font-black uppercase rounded-none px-6 py-2.5 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            Aller au profil
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] py-12 px-6 font-sans">
      <div className="container max-w-5xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b-3 border-black pb-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-wide text-black flex items-center gap-2">
              <Heart className="w-9 h-9 text-rose-500 fill-rose-500" /> Carnet de Santé
            </h1>
            <p className="text-gray-500 font-bold uppercase text-xs tracking-wider mt-1">Suivi médical & Rendez-vous Vétérinaires (Style Doctolib)</p>
          </div>

          {/* Dogs Selector */}
          <div className="flex gap-2">
            {myDogs.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDogId(d.id)}
                className={`px-4 py-2 border-2 border-black font-black uppercase text-xs rounded-none shadow-[3px_3px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] transition-all ${activeDogId === d.id ? "bg-black text-white" : "bg-white text-black hover:bg-gray-50"}`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: Health Overview & Docs */}
          <div className="space-y-8 lg:col-span-2">
            
            {/* Carnet de sante card */}
            <Card className="p-6 border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                <Activity className="w-5 h-5 text-rose-500" /> Dossier Médical
              </h2>
              <form onSubmit={handleUpdateHealth} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="block text-[10px] font-black uppercase mb-1">Poids actuel (kg)</Label>
                  <Input type="number" step="0.1" value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder={healthRecord?.weight || "Ex: 14.5"} className="border-2 border-black rounded-none font-bold" />
                </div>
                <div>
                  <Label className="block text-[10px] font-black uppercase mb-1">Allergies connues</Label>
                  <Input value={allergiesInput} onChange={e => setAllergiesInput(e.target.value)} placeholder={healthRecord?.allergies || "Ex: Poulet, Boeuf"} className="border-2 border-black rounded-none font-bold" />
                </div>
                <div className="md:col-span-2">
                  <Label className="block text-[10px] font-black uppercase mb-1">Antécédents médicaux</Label>
                  <Textarea value={historyInput} onChange={e => setHistoryInput(e.target.value)} placeholder={healthRecord?.medicalHistory || "Opérations, maladies passées..."} rows={2} className="border-2 border-black rounded-none font-semibold" />
                </div>
                <div className="md:col-span-2">
                  <Label className="block text-[10px] font-black uppercase mb-1">Traitements en cours</Label>
                  <Textarea value={treatmentInput} onChange={e => setTreatmentInput(e.target.value)} placeholder={healthRecord?.treatmentInfo || "Médicaments, vermifuge..."} rows={2} className="border-2 border-black rounded-none font-semibold" />
                </div>
                <Button type="submit" className="md:col-span-2 bg-black text-white hover:bg-gray-900 border-2 border-black font-black uppercase text-xs py-2 rounded-none">
                  Enregistrer les modifications
                </Button>
              </form>
            </Card>

            {/* Vaccines list card */}
            <Card className="p-6 border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                💉 Suivi des Vaccins (Rappels)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-gray-500 mb-2">Historique des injections</h3>
                  {vaccines && vaccines.length > 0 ? (
                    vaccines.map(v => (
                      <div key={v.id} className="p-3 border border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs font-semibold space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-black">{v.name}</span>
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border border-black ${v.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-600' : 'bg-rose-50 text-rose-600 border-rose-600'}`}>
                            {v.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500">Injecté le : {new Date(v.administeredDate).toLocaleDateString()}</p>
                        <p className="text-[10px] text-gray-500 font-bold">Prochain rappel : {new Date(v.nextBoosterDate).toLocaleDateString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground font-semibold">Aucun vaccin enregistré.</p>
                  )}
                </div>

                {/* Form */}
                <form onSubmit={handleAddVaccine} className="p-4 border-2 border-dashed border-gray-300 space-y-3">
                  <h3 className="text-xs font-black uppercase text-black mb-1">Ajouter une injection</h3>
                  <div>
                    <Label className="block text-[9px] font-black uppercase mb-0.5">Nom du vaccin</Label>
                    <Input value={vacName} onChange={e => setVacName(e.target.value)} placeholder="Ex: Rage, CHPP" className="h-8 border border-black rounded-none text-xs" />
                  </div>
                  <div>
                    <Label className="block text-[9px] font-black uppercase mb-0.5">Date d'injection</Label>
                    <Input type="date" value={vacAdminDate} onChange={e => setVacAdminDate(e.target.value)} className="h-8 border border-black rounded-none text-xs" />
                  </div>
                  <div>
                    <Label className="block text-[9px] font-black uppercase mb-0.5">Prochain rappel</Label>
                    <Input type="date" value={vacNextDate} onChange={e => setVacNextDate(e.target.value)} className="h-8 border border-black rounded-none text-xs" />
                  </div>
                  <Button type="submit" size="sm" className="w-full bg-black text-white hover:bg-gray-900 border border-black font-bold uppercase text-[10px] py-1.5 rounded-none">
                    Valider l'injection
                  </Button>
                </form>
              </div>
            </Card>

            {/* Documents & prescriptions card */}
            <Card className="p-6 border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" /> Ordonnances & Documents
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-gray-500 mb-2">Fichiers sauvegardés</h3>
                  {documents && documents.length > 0 ? (
                    documents.map(d => (
                      <div key={d.id} className="p-3 border border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs flex justify-between items-center">
                        <div>
                          <p className="font-black text-black">{d.documentName}</p>
                          <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{d.documentType}</span>
                        </div>
                        <a href={d.documentUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black text-pink-500 underline uppercase tracking-wider">
                          Ouvrir
                        </a>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground font-semibold">Aucun document médical stocké.</p>
                  )}
                </div>

                {/* Form */}
                <form onSubmit={handleAddDocument} className="p-4 border-2 border-dashed border-gray-300 space-y-3">
                  <h3 className="text-xs font-black uppercase text-black mb-1">Archiver un document</h3>
                  <div>
                    <Label className="block text-[9px] font-black uppercase mb-0.5">Titre du document</Label>
                    <Input value={docNameInput} onChange={e => setDocNameInput(e.target.value)} placeholder="Ex: Radio hanche gauche" className="h-8 border border-black rounded-none text-xs" />
                  </div>
                  <div>
                    <Label className="block text-[9px] font-black uppercase mb-0.5">Type de pièce</Label>
                    <select value={docTypeInput} onChange={e => setDocTypeInput(e.target.value as any)} className="w-full h-8 border border-black rounded-none text-xs font-bold bg-white">
                      <option value="prescription">📜 Ordonnance</option>
                      <option value="certificate">🎓 Certificat de bonne santé</option>
                      <option value="other">📦 Autre document</option>
                    </select>
                  </div>
                  <div>
                    <Label className="block text-[9px] font-black uppercase mb-0.5">Fichier</Label>
                    <Input type="file" onChange={handleFileUpload} className="h-8 border border-black rounded-none text-xs" />
                  </div>
                  <Button type="submit" size="sm" className="w-full bg-black text-white hover:bg-gray-900 border border-black font-bold uppercase text-[10px] py-1.5 rounded-none">
                    Archiver le fichier
                  </Button>
                </form>
              </div>
            </Card>

          </div>

          {/* Column 2: Booking Appointments (Doctolib style) */}
          <div className="space-y-8">
            
            {/* Direct Booking Clinic Card */}
            <Card className="p-6 border-2 border-black rounded-none shadow-[4px_4px_0px_rgba(0,0,0,1)] bg-white">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2 text-black">
                <Calendar className="w-5 h-5 text-rose-500" /> Prendre Rendez-vous
              </h2>

              <form onSubmit={handleBookAppointment} className="space-y-4">
                <div>
                  <Label className="block text-[10px] font-black uppercase mb-1">Choix de la clinique / Praticien</Label>
                  <select
                    value={bookingVetId || ""}
                    onChange={e => {
                      const val = e.target.value;
                      setBookingVetId(val ? parseInt(val) : null);
                    }}
                    className="w-full p-2 border-2 border-black rounded-none font-bold text-xs bg-white"
                  >
                    <option value="">-- Saisie libre manuelle (Option A) --</option>
                    {nearbyVets && nearbyVets.map(v => (
                      <option key={v.id} value={v.id}>
                        🏥 {v.name} ({v.clinicName}) {v.isPartner ? "★ Partenaire" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {!bookingVetId && (
                  <div>
                    <Label className="block text-[10px] font-black uppercase mb-1">Nom du vétérinaire libre (Option A)</Label>
                    <Input value={customVetName} onChange={e => setCustomVetName(e.target.value)} placeholder="Ex: Dr. Martin, Clinique des Fleurs" className="border-2 border-black rounded-none font-bold text-xs" />
                  </div>
                )}

                <div>
                  <Label className="block text-[10px] font-black uppercase mb-1">Date & Heure du rendez-vous</Label>
                  <Input type="datetime-local" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} className="border-2 border-black rounded-none font-bold text-xs" />
                </div>

                <div>
                  <Label className="block text-[10px] font-black uppercase mb-1">Motif de consultation</Label>
                  <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Boiterie patte arrière, Rappel Rage" className="border-2 border-black rounded-none font-bold text-xs" />
                </div>

                <div>
                  <Label className="block text-[10px] font-black uppercase mb-1">Notes / Remarques</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Symptômes constatés, dossier à apporter..." rows={3} className="border-2 border-black rounded-none font-semibold text-xs" />
                </div>

                <Button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] uppercase text-xs py-2.5 rounded-none">
                  Prendre le rendez-vous
                </Button>
              </form>
            </Card>

            {/* Safety Share Badge */}
            <Card className="p-4 border-2 border-black bg-blue-50/70 flex items-start gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-none font-semibold">
              <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-blue-950">Sécurité & Partage Actif</h4>
                <p className="text-xs text-blue-900 mt-1 leading-relaxed">
                  Le carnet de santé et les vaccins de votre compagnon seront automatiquement partagés avec les dogsitters ayant des réservations confirmées afin de garantir leur sécurité.
                </p>
              </div>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
}
