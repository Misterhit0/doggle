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
import { Plus, Edit2, Trash2, Star, Dog, Camera } from "lucide-react";

// Helper to safely parse JSON fields
function parsePhotoUrls(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}
function parsePersonality(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export default function DogsPage() {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editingDogId, setEditingDogId] = useState<number | null>(null);

  // Fetch user's dogs
  const { data: dogs, isLoading, refetch } = trpc.dog.getMyDogs.useQuery();
  const uploadPhotoMutation = trpc.storage.uploadPhoto.useMutation();

  // Create dog mutation
  const createDogMutation = trpc.dog.createDog.useMutation({
    onSuccess: () => {
      toast.success("Chien créé avec succès!");
      setIsCreating(false);
      setFormData({ name: "", breed: "", age: "", description: "", personality: [], photoUrls: [] });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la création du chien");
    },
  });

  // Update dog mutation
  const updateDogMutation = trpc.dog.updateDog.useMutation({
    onSuccess: () => {
      toast.success("Chien mis à jour avec succès!");
      setEditingDogId(null);
      setFormData({ name: "", breed: "", age: "", description: "", personality: [], photoUrls: [] });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la mise à jour du chien");
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    age: "",
    description: "",
    personality: [] as string[],
    photoUrls: [] as string[],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePersonalityToggle = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personality: prev.personality.includes(trait)
        ? prev.personality.filter((t: string) => t !== trait)
        : [...prev.personality, trait],
    }));
  };

  const handleAddPhotoUrl = () => {
    setFormData(prev => {
      if (prev.photoUrls.length >= 3) {
        toast.error("Vous pouvez ajouter jusqu'à 3 photos maximum.");
        return prev;
      }
      return { ...prev, photoUrls: [...prev.photoUrls, ""] };
    });
  };

  const handlePhotoUrlChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      photoUrls: prev.photoUrls.map((url, i) => (i === index ? value : url)),
    }));
  };

  const handleRemovePhotoUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photoUrls: prev.photoUrls.filter((_, i) => i !== index),
    }));
  };

  const handleSetFavoritePhoto = (index: number) => {
    if (index === 0) return;
    setFormData(prev => {
      const newUrls = [...prev.photoUrls];
      const [fav] = newUrls.splice(index, 1);
      newUrls.unshift(fav);
      return { ...prev, photoUrls: newUrls };
    });
    toast.success("Photo principale mise à jour!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Le nom du chien est obligatoire");
      return;
    }
    const payload = {
      name: formData.name,
      breed: formData.breed || undefined,
      age: formData.age ? parseInt(formData.age) : undefined,
      description: formData.description || undefined,
      personality: formData.personality.length > 0 ? formData.personality : undefined,
      photoUrls: formData.photoUrls.filter(url => url.trim()).length > 0 ? formData.photoUrls.filter(url => url.trim()) : undefined,
    };
    if (editingDogId) {
      await updateDogMutation.mutateAsync({ dogId: editingDogId, ...payload });
    } else {
      await createDogMutation.mutateAsync(payload);
    }
  };

  const startEdit = (dog: any) => {
    setEditingDogId(dog.id);
    setFormData({
      name: dog.name,
      breed: dog.breed || "",
      age: dog.age?.toString() || "",
      description: dog.description || "",
      personality: parsePersonality(dog.personality),
      photoUrls: parsePhotoUrls(dog.photoUrls),
    });
  };

  const cancelEdit = () => {
    setEditingDogId(null);
    setIsCreating(false);
    setFormData({ name: "", breed: "", age: "", description: "", personality: [], photoUrls: [] });
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
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold uppercase text-foreground mb-2">Mes Chiens</h1>
            <p className="text-muted-foreground">Gérez les profils de vos chiens</p>
          </div>
          {!isCreating && editingDogId === null && (
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              <Plus size={20} />
              Ajouter un chien
            </Button>
          )}
        </div>

        {/* Form for creating/editing dog */}
        {(isCreating || editingDogId !== null) && (
          <Card className="p-8 mb-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold uppercase text-foreground mb-6">
              {editingDogId ? "Modifier le chien" : "Ajouter un nouveau chien"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom du chien *</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nom du chien" required />
                </div>
                <div>
                  <Label htmlFor="breed">Race</Label>
                  <Input id="breed" name="breed" value={formData.breed} onChange={handleInputChange} placeholder="ex: Labrador" />
                </div>
              </div>

              <div>
                <Label htmlFor="age">Âge (années)</Label>
                <Input id="age" name="age" type="number" min="0" max="50" value={formData.age} onChange={handleInputChange} placeholder="Âge du chien" />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Décrivez votre chien..." maxLength={500} rows={4} />
              </div>

              <div>
                <Label className="mb-3 block">Personnalité</Label>
                <div className="grid grid-cols-2 gap-3">
                  {["Joueur", "Calme", "Énergique", "Sociable", "Timide", "Affectueux"].map(trait => (
                    <div key={trait} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`trait-${trait}`}
                        checked={formData.personality.includes(trait)}
                        onChange={() => handlePersonalityToggle(trait)}
                        className="rounded"
                      />
                      <label htmlFor={`trait-${trait}`} className="text-sm cursor-pointer">{trait}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="block">Photos du chien (3 max, la 1ère est la favorite ⭐)</Label>
                  <span className="text-xs text-muted-foreground">{formData.photoUrls.length}/3</span>
                </div>
                <div className="space-y-3">
                  {formData.photoUrls.map((url, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Button
                        type="button"
                        variant={index === 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSetFavoritePhoto(index)}
                        className={`h-10 px-3 border-2 border-black ${
                          index === 0
                            ? "bg-yellow-400 text-black hover:bg-yellow-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            : "bg-white text-neutral-400 hover:text-black"
                        }`}
                        title={index === 0 ? "Photo favorite" : "Définir comme favorite"}
                      >
                        ★
                      </Button>
                      <div className="flex-1 relative">
                        {url ? (
                          <div className="flex gap-2 items-center">
                            <div className="flex-1 text-xs truncate bg-muted px-3 py-2 border border-black rounded">
                              {url}
                            </div>
                            <div className="w-10 h-10 rounded border border-black overflow-hidden bg-muted flex-shrink-0">
                              <img src={url} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        ) : (
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  const base64 = event.target?.result as string;
                                  try {
                                    toast.loading("Upload de la photo...", { id: `upload-dog-${index}` });
                                    const res = await uploadPhotoMutation.mutateAsync({
                                      base64Data: base64,
                                      filename: file.name,
                                    });
                                    handlePhotoUrlChange(index, res.url);
                                    toast.success("Photo uploadée !", { id: `upload-dog-${index}` });
                                  } catch (err: any) {
                                    toast.error(err.message || "Erreur lors de l'upload", { id: `upload-dog-${index}` });
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        )}
                        {index === 0 && (
                          <span className="absolute right-3 top-2.5 text-[9px] uppercase font-black tracking-wider text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300">
                            Favori
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePhotoUrl(index)}
                        className="h-10 w-10 border-2 border-black hover:bg-red-100 text-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                {formData.photoUrls.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddPhotoUrl}
                    className="mt-3 w-full border-2 border-dashed border-black font-bold uppercase hover:bg-neutral-50 gap-2"
                  >
                    <Camera size={16} />
                    + Ajouter une photo
                  </Button>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={createDogMutation.isPending || updateDogMutation.isPending}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  {createDogMutation.isPending || updateDogMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button type="button" variant="outline" onClick={cancelEdit} className="flex-1 border-2 border-black">
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Dogs list — Tinder-style cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {dogs && dogs.length > 0 ? (
            dogs.map((dog: any) => {
              const photos = parsePhotoUrls(dog.photoUrls);
              const personality = parsePersonality(dog.personality);
              const favoritePhoto = photos[0] || null;

              return (
                <div key={dog.id} className="group">
                  {/* Tinder-style dog card */}
                  <div
                    className="relative h-[420px] rounded-2xl overflow-hidden border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    style={{ borderWidth: '3px' }}
                  >
                    {/* Background photo or placeholder */}
                    {favoritePhoto ? (
                      <img
                        src={favoritePhoto}
                        alt={dog.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const placeholder = parent.querySelector('.photo-placeholder') as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}

                    {/* No photo placeholder */}
                    <div
                      className="photo-placeholder absolute inset-0 bg-gradient-to-br from-amber-100 to-orange-200 flex flex-col items-center justify-center"
                      style={{ display: favoritePhoto ? 'none' : 'flex' }}
                    >
                      <Dog size={64} className="text-amber-400 mb-2" />
                      <span className="text-amber-600 font-bold text-sm uppercase tracking-wider">Pas de photo</span>
                    </div>

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    {/* Favorite star badge */}
                    {photos.length > 0 && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-yellow-400 text-black text-xs font-black px-2 py-1 rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <Star size={10} fill="black" />
                        Photo favorite
                      </div>
                    )}

                    {/* Photos count badge */}
                    {photos.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full border border-white/30">
                        {photos.length} 📷
                      </div>
                    )}

                    {/* Dog info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <div className="flex items-end justify-between mb-2">
                        <div>
                          <h3 className="text-3xl font-black tracking-tight drop-shadow-lg">{dog.name}</h3>
                          <p className="text-sm font-semibold text-white/90 drop-shadow">
                            {[dog.breed, dog.age ? `${dog.age} ans` : null].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                      </div>

                      {dog.description && (
                        <p className="text-xs text-white/80 mb-3 line-clamp-2 leading-relaxed">{dog.description}</p>
                      )}

                      {personality.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {personality.slice(0, 3).map((trait: string) => (
                            <span
                              key={trait}
                              className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold rounded-full border border-white/40"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => startEdit(dog)}
                          size="sm"
                          className="flex-1 gap-2 bg-white text-black hover:bg-white/90 font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all text-xs"
                        >
                          <Edit2 size={14} />
                          Modifier
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Thumbnail strip for additional photos */}
                  {photos.length > 1 && (
                    <div className="flex gap-2 mt-2 px-1">
                      {photos.slice(1).map((url: string, idx: number) => (
                        <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
                          <img
                            src={url}
                            alt={`${dog.name} photo ${idx + 2}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-20">
              <Dog size={64} className="mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground mb-4 text-lg font-semibold">Aucun chien pour le moment</p>
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                Ajouter votre premier chien
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
