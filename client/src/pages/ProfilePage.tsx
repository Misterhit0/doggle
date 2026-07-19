import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useLocation } from "wouter";

const parseJsonArray = (val: any): any[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

function WalkingStatsWidget() {
  const { data: walksList, refetch: refetchWalks } = trpc.walks.getMyWalks.useQuery();
  const { data: currentGoals, refetch: refetchGoals } = trpc.walks.getCurrentGoals.useQuery();
  const setGoalMutation = trpc.walks.setOrUpdateGoal.useMutation();

  const [distGoalInput, setDistGoalInput] = useState(15);
  const [durGoalInput, setDurGoalInput] = useState(10);

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const weeklyMeters = walksList
    ? walksList
        .filter(w => new Date(w.startedAt) >= sevenDaysAgo)
        .reduce((sum, w) => sum + w.distanceMeters, 0)
    : 0;

  const weeklySeconds = walksList
    ? walksList
        .filter(w => new Date(w.startedAt) >= sevenDaysAgo)
        .reduce((sum, w) => sum + w.durationSeconds, 0)
    : 0;

  const distanceGoal = currentGoals?.find(g => g.goalType === "distance");
  const durationGoal = currentGoals?.find(g => g.goalType === "duration");

  const targetMeters = distanceGoal?.targetValue ?? 15000;
  const targetSeconds = durationGoal?.targetValue ?? 36000;

  const distPercent = Math.min(100, Math.round((weeklyMeters / targetMeters) * 100));
  const durPercent = Math.min(100, Math.round((weeklySeconds / targetSeconds) * 100));

  const handleUpdateGoals = async () => {
    try {
      await setGoalMutation.mutateAsync({
        goalType: "distance",
        targetValue: distGoalInput * 1000,
        period: "weekly",
      });
      await setGoalMutation.mutateAsync({
        goalType: "duration",
        targetValue: durGoalInput * 3600,
        period: "weekly",
      });
      toast.success("Objectifs mis à jour !");
      refetchGoals();
    } catch (err: any) {
      toast.error(err.message || "Erreur de mise à jour");
    }
  };

  return (
    <Card className="p-8 mb-8 border-2 border-accent bg-[#FFFDF9] shadow-[4px_4px_0px_rgba(0,0,0,1)] rounded-none">
      <h2 className="text-2xl font-black uppercase tracking-wider mb-6 text-black">Objectifs & Balades</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between font-black text-xs uppercase">
            <span>Distance (7j glissants)</span>
            <span className="text-pink-500">{(weeklyMeters / 1000).toFixed(1)} / {(targetMeters / 1000).toFixed(0)} km</span>
          </div>
          <div className="w-full h-4 border-2 border-black bg-white rounded-none overflow-hidden p-0.5">
            <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${distPercent}%` }} />
          </div>
          <p className="text-[10px] font-black text-gray-500 uppercase">{distPercent}% de l'objectif atteint</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between font-black text-xs uppercase">
            <span>Temps de balade</span>
            <span className="text-pink-500">{(weeklySeconds / 3600).toFixed(1)} / {(targetSeconds / 3600).toFixed(0)} h</span>
          </div>
          <div className="w-full h-4 border-2 border-black bg-white rounded-none overflow-hidden p-0.5">
            <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: `${durPercent}%` }} />
          </div>
          <p className="text-[10px] font-black text-gray-500 uppercase">{durPercent}% de l'objectif atteint</p>
        </div>
      </div>

      <div className="bg-white border-2 border-black p-4 mb-6 space-y-4 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
        <h3 className="font-black text-xs uppercase text-black">Ajuster mes objectifs</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Objectif Distance (km)</label>
            <input type="number" min="1" value={distGoalInput} onChange={e => setDistGoalInput(Number(e.target.value))} className="w-full p-2 border border-black font-bold text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase mb-1">Objectif Temps (heures)</label>
            <input type="number" min="1" value={durGoalInput} onChange={e => setDurGoalInput(Number(e.target.value))} className="w-full p-2 border border-black font-bold text-xs" />
          </div>
        </div>
        <Button onClick={handleUpdateGoals} size="sm" className="w-full bg-black text-white hover:bg-gray-900 border border-black font-bold text-xs uppercase">
          Enregistrer les objectifs
        </Button>
      </div>

      <div>
        <h3 className="font-black text-sm uppercase mb-3 text-black">Historique récent</h3>
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {walksList && walksList.length > 0 ? (
            walksList.slice(0, 5).map(w => (
              <div key={w.id} className="p-3 border border-black bg-white shadow-[2px_2px_0px_rgba(0,0,0,1)] text-xs flex justify-between items-center">
                <div>
                  <p className="font-black text-black">{new Date(w.startedAt).toLocaleDateString()} à {new Date(w.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  <p className="text-gray-500 font-semibold mt-0.5">{(w.distanceMeters / 1000).toFixed(2)} km • {Math.round(w.durationSeconds / 60)} minutes</p>
                </div>
                <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-500 px-2 py-0.5">
                  Synchronisé
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground font-semibold">Aucune balade enregistrée pour le moment.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [dogs, setDogs] = useState<any[]>([]);
  const [newDog, setNewDog] = useState({ name: "", breed: "", age: "" });

  // Fetch user profile
  const { data: profile, isLoading, refetch } = trpc.user.getProfile.useQuery();
  // Fetch actual user dogs
  const { data: myDogs } = trpc.dog.getMyDogs.useQuery();
  const uploadPhotoMutation = trpc.storage.uploadPhoto.useMutation();


  // Update profile mutation
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil mis à jour avec succès!");
      setIsEditing(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la mise à jour du profil");
    },
  });

  // Create dog mutation
  const createDogMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Chien ajouté avec succès!");
      setNewDog({ name: "", breed: "", age: "" });
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout du chien");
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    age: profile?.age?.toString() || "",
    interests: parseJsonArray(profile?.interests),
    walkingHabits: profile?.walkingHabits || "",
    walkingZone: (profile as any)?.walkingZone || "",
    whatISeek: parseJsonArray(profile?.whatISeek) as ("friend" | "mentor" | "intergenerational")[],
    bio: profile?.bio || "",
    profilePhotoUrl: profile?.profilePhotoUrl || "",
    phoneNumber: (profile as any)?.phoneNumber || "",
    dogsittingFriendly: !!profile?.dogsittingFriendly,
    sociability: (profile as any)?.sociability || {
      withDogs: false,
      withChildren: false,
      withStrangers: false,
    },
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        age: profile.age?.toString() || "",
        interests: parseJsonArray(profile.interests),
        walkingHabits: profile.walkingHabits || "",
        walkingZone: (profile as any).walkingZone || "",
        whatISeek: parseJsonArray(profile.whatISeek) as ("friend" | "mentor" | "intergenerational")[],
        bio: profile.bio || "",
        profilePhotoUrl: profile.profilePhotoUrl || "",
        phoneNumber: (profile as any).phoneNumber || "",
        dogsittingFriendly: !!profile.dogsittingFriendly,
        sociability: (profile as any).sociability || {
          withDogs: false,
          withChildren: false,
          withStrangers: false,
        },
      });
      if ((profile as any).dogs) {
        setDogs((profile as any).dogs);
      }
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i: string) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSeekToggle = (seek: "friend" | "mentor" | "intergenerational") => {
    setFormData(prev => ({
      ...prev,
      whatISeek: prev.whatISeek.includes(seek)
        ? prev.whatISeek.filter((s) => s !== seek)
        : [...prev.whatISeek, seek],
    }));
  };

  const handleSociabilityToggle = (key: string) => {
    setFormData(prev => ({
      ...prev,
      sociability: {
        ...prev.sociability,
        [key]: !prev.sociability[key as keyof typeof prev.sociability],
      },
    }));
  };

  const handleAddDog = async () => {
    if (!newDog.name) {
      toast.error("Veuillez entrer le nom du chien");
      return;
    }
    if (!newDog.breed) {
      toast.error("Veuillez sélectionner la race");
      return;
    }

    // For now, just add to local state
    const dog = {
      id: Math.random(),
      name: newDog.name,
      breed: newDog.breed,
      age: newDog.age ? parseInt(newDog.age) : undefined,
    };
    setDogs([...dogs, dog]);
    setNewDog({ name: "", breed: "", age: "" });
    toast.success("Chien ajouté avec succès!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileMutation.mutateAsync({
      age: formData.age ? parseInt(formData.age) : undefined,
      interests: formData.interests.length > 0 ? formData.interests : undefined,
      walkingHabits: formData.walkingHabits || undefined,
      whatISeek: formData.whatISeek.length > 0 ? formData.whatISeek : undefined,
      bio: formData.bio || undefined,
      profilePhotoUrl: formData.profilePhotoUrl || undefined,
      phoneNumber: formData.phoneNumber || undefined,
      dogsittingFriendly: formData.dogsittingFriendly,
    } as any);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold uppercase text-foreground mb-2">Mon Profil</h1>
          <p className="text-muted-foreground">Complétez votre profil pour trouver des matches</p>
        </div>

        {!isEditing ? (
          <>
            {/* Profile Overview */}
            <Card className="p-8 mb-8 border-2 border-accent">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Nom</p>
                    <p className="text-lg font-semibold text-foreground">{user?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Âge</p>
                    <p className="text-lg font-semibold text-foreground">{profile?.age || "Non renseigné"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Téléphone (WhatsApp)</p>
                  <p className="text-lg font-semibold text-foreground">{(profile as any)?.phoneNumber || "Non renseigné"}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Bio</p>
                  <p className="text-foreground">{profile?.bio || "Pas de bio"}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Zone de balade</p>
                  <p className="text-foreground">{(profile as any)?.walkingZone || "Non renseignée"}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Option Garde & Dog-sitting</p>
                  <p className="text-foreground font-black uppercase text-xs">
                    {profile?.dogsittingFriendly ? "✅ Option 'dogsitting friendly' activée" : "❌ Option 'dogsitting friendly' désactivée"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Intérêts</p>
                  <div className="flex flex-wrap gap-2">
                    {profile?.interests && Array.isArray(profile.interests) && profile.interests.length > 0 ? (
                      profile.interests.map((interest: string) => (
                        <span key={interest} className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm">
                          {interest}
                        </span>
                      ))
                    ) : (
                      <p className="text-muted-foreground">Aucun intérêt renseigné</p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
                >
                  Modifier mon profil
                </Button>
              </div>
            </Card>
            
            {/* Walking Goals & Statistics Section */}
            <WalkingStatsWidget />

            {/* Dogs Section */}
            <Card className="p-8 border-2 border-accent">
              <h2 className="text-2xl font-bold uppercase mb-6 text-foreground">Mes chiens</h2>
              {myDogs && myDogs.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {myDogs.map((dog) => (
                    <div key={dog.id} className="p-4 border-2 border-muted rounded-lg">
                      <p className="font-bold text-foreground">{dog.name}</p>
                      <p className="text-sm text-muted-foreground">{dog.breed} • {dog.age} ans</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground mb-6">Aucun chien ajouté</p>
              )}
              <Button
                onClick={() => setLocation("/dogs")}
                variant="outline"
                className="w-full"
              >
                <Plus size={20} className="mr-2" />
                Ajouter un chien
              </Button>
            </Card>
          </>
        ) : (
          <Card className="p-8 border-2 border-accent">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Info */}
              <div>
                <h3 className="text-xl font-bold uppercase mb-4 text-foreground">Informations personnelles</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Âge</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      min="1"
                      max="150"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="Votre âge"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profilePhotoFile">Photo de profil</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="profilePhotoFile"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              const base64 = event.target?.result as string;
                              try {
                                toast.loading("Upload de la photo...", { id: "upload-profile" });
                                const res = await uploadPhotoMutation.mutateAsync({
                                  base64Data: base64,
                                  filename: file.name,
                                });
                                setFormData(prev => ({
                                  ...prev,
                                  profilePhotoUrl: res.url,
                                }));
                                toast.success("Photo uploadée avec succès !", { id: "upload-profile" });
                              } catch (err: any) {
                                toast.error(err.message || "Erreur lors de l'upload", { id: "upload-profile" });
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {formData.profilePhotoUrl && (
                        <div className="w-10 h-10 rounded border border-black overflow-hidden flex-shrink-0 bg-muted">
                          <img src={formData.profilePhotoUrl} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Label htmlFor="phoneNumber">Numéro de téléphone (WhatsApp)</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Ex: +33612345678"
                  />
                </div>

                <div className="mt-4">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Parlez-nous de vous..."
                    maxLength={500}
                    rows={4}
                  />
                </div>
              </div>

              {/* Walking Preferences */}
              <div>
                <h3 className="text-xl font-bold uppercase mb-4 text-foreground">Préférences de balade</h3>
                <div>
                  <Label htmlFor="walkingZone">Zone de balade préférée</Label>
                  <Input
                    id="walkingZone"
                    name="walkingZone"
                    value={formData.walkingZone}
                    onChange={handleInputChange}
                    placeholder="Ex: Parc de la Tête d'Or, Vieux Lyon, Confluence..."
                  />
                </div>

                <div className="mt-4">
                  <Label htmlFor="walkingHabits">Habitudes de balade</Label>
                  <Textarea
                    id="walkingHabits"
                    name="walkingHabits"
                    value={formData.walkingHabits}
                    onChange={handleInputChange}
                    placeholder="Ex: Balades le matin, 30 min, en forêt..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Interests */}
              <div>
                <h3 className="text-xl font-bold uppercase mb-4 text-foreground">Intérêts</h3>
                <div className="space-y-2">
                  {["Randonnée", "Parc", "Plage", "Café", "Sports", "Voyages"].map(interest => (
                    <div key={interest} className="flex items-center gap-2">
                      <Checkbox
                        id={`interest-${interest}`}
                        checked={formData.interests.includes(interest)}
                        onCheckedChange={() => handleInterestToggle(interest)}
                      />
                      <label htmlFor={`interest-${interest}`} className="text-sm cursor-pointer">
                        {interest}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sociability */}
              <div>
                <h3 className="text-xl font-bold uppercase mb-4 text-foreground">Sociabilité</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="withDogs"
                      checked={formData.sociability.withDogs}
                      onCheckedChange={() => handleSociabilityToggle("withDogs")}
                    />
                    <label htmlFor="withDogs" className="text-sm cursor-pointer">
                      Mon chien s'entend bien avec les autres chiens
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="withChildren"
                      checked={formData.sociability.withChildren}
                      onCheckedChange={() => handleSociabilityToggle("withChildren")}
                    />
                    <label htmlFor="withChildren" className="text-sm cursor-pointer">
                      Mon chien s'entend bien avec les enfants
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="withStrangers"
                      checked={formData.sociability.withStrangers}
                      onCheckedChange={() => handleSociabilityToggle("withStrangers")}
                    />
                    <label htmlFor="withStrangers" className="text-sm cursor-pointer">
                      Mon chien s'entend bien avec les étrangers
                    </label>
                  </div>
                </div>
              </div>

              {/* Dog-sitting preference */}
              <div>
                <h3 className="text-xl font-bold uppercase mb-4 text-foreground">Option Garde & Dog-sitting</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="dogsittingFriendly"
                    checked={formData.dogsittingFriendly}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, dogsittingFriendly: !!checked }));
                    }}
                  />
                  <label htmlFor="dogsittingFriendly" className="text-sm font-bold cursor-pointer">
                    Activer l'option 'dogsitting friendly' (permet d'être visible par les dog-sitters)
                  </label>
                </div>
              </div>

              {/* What I Seek */}
              <div>
                <h3 className="text-xl font-bold uppercase mb-4 text-foreground">Ce que je cherche</h3>
                <div className="space-y-2">
                  {[
                    { value: "friend" as const, label: "Un ami" },
                    { value: "mentor" as const, label: "Un mentor" },
                    { value: "intergenerational" as const, label: "Un echange intergenerational" },
                  ].map(option => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`seek-${option.value}`}
                        checked={formData.whatISeek.includes(option.value)}
                        onCheckedChange={() => handleSeekToggle(option.value)}
                      />
                      <label htmlFor={`seek-${option.value}`} className="text-sm cursor-pointer">
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dogs Management */}
              <div>
                <h3 className="text-xl font-bold uppercase mb-4 text-foreground">Mes chiens</h3>
                {dogs && dogs.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {dogs.map((dog) => (
                      <div key={dog.id} className="flex items-center justify-between p-3 border-2 border-muted rounded-lg">
                        <div>
                          <p className="font-bold text-foreground">{dog.name}</p>
                          <p className="text-sm text-muted-foreground">{dog.breed} • {dog.age} ans</p>
                        </div>
                        <button type="button" className="text-red-600 hover:text-red-700">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 border-2 border-dashed border-accent rounded-lg">
                  <h4 className="font-bold mb-3 text-foreground">Ajouter un chien</h4>
                  <div className="space-y-3">
                    <Input
                      placeholder="Nom du chien"
                      value={newDog.name}
                      onChange={(e) => setNewDog({ ...newDog, name: e.target.value })}
                    />
                    <Input
                      placeholder="Race"
                      value={newDog.breed}
                      onChange={(e) => setNewDog({ ...newDog, breed: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Âge (années)"
                      value={newDog.age}
                      onChange={(e) => setNewDog({ ...newDog, age: e.target.value })}
                    />
                    <Button
                      type="button"
                      onClick={handleAddDog}
                      disabled={createDogMutation.isPending}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
                    >
                      {createDogMutation.isPending ? "Ajout..." : "Ajouter"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
                >
                  {updateProfileMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
