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
