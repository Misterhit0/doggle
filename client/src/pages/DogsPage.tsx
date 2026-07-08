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
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function DogsPage() {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [editingDogId, setEditingDogId] = useState<number | null>(null);

  // Fetch user's dogs
  const { data: dogs, isLoading, refetch } = trpc.dog.getMyDogs.useQuery();

  // Create dog mutation
  const createDogMutation = trpc.dog.createDog.useMutation({
    onSuccess: () => {
      toast.success("Chien créé avec succès!");
      setIsCreating(false);
      setFormData({
        name: "",
        breed: "",
        age: "",
        description: "",
        personality: [],
        photoUrls: [],
      });
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
      setFormData({
        name: "",
        breed: "",
        age: "",
        description: "",
        personality: [],
        photoUrls: [],
      });
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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
    setFormData(prev => ({
      ...prev,
      photoUrls: [...prev.photoUrls, ""],
    }));
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
      await updateDogMutation.mutateAsync({
        dogId: editingDogId,
        ...payload,
      });
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
      personality: dog.personality && typeof dog.personality === 'string' ? JSON.parse(dog.personality) : [],
      photoUrls: dog.photoUrls && typeof dog.photoUrls === 'string' ? JSON.parse(dog.photoUrls) : [],
    });
  };

  const cancelEdit = () => {
    setEditingDogId(null);
    setIsCreating(false);
    setFormData({
      name: "",
      breed: "",
      age: "",
      description: "",
      personality: [],
      photoUrls: [],
    });
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold uppercase text-foreground mb-2">Mes Chiens</h1>
            <p className="text-muted-foreground">Gérez les profils de vos chiens</p>
          </div>
          {!isCreating && editingDogId === null && (
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase gap-2"
            >
              <Plus size={20} />
              Ajouter un chien
            </Button>
          )}
        </div>

        {/* Form for creating/editing dog */}
        {(isCreating || editingDogId !== null) && (
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold uppercase text-foreground mb-6">
              {editingDogId ? "Modifier le chien" : "Ajouter un nouveau chien"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom du chien *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Nom du chien"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="breed">Race</Label>
                  <Input
                    id="breed"
                    name="breed"
                    value={formData.breed}
                    onChange={handleInputChange}
                    placeholder="ex: Labrador"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="age">Âge (années)</Label>
                <Input
                  id="age"
                  name="age"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.age}
                  onChange={handleInputChange}
                  placeholder="Âge du chien"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Décrivez votre chien..."
                  maxLength={500}
                  rows={4}
                />
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
                      <label htmlFor={`trait-${trait}`} className="text-sm cursor-pointer">
                        {trait}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Photos du chien (URLs)</Label>
                <div className="space-y-2">
                  {formData.photoUrls.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={url}
                        onChange={(e) => handlePhotoUrlChange(index, e.target.value)}
                        placeholder="https://..."
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePhotoUrl(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPhotoUrl}
                  className="mt-2 w-full"
                >
                  + Ajouter une photo
                </Button>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={createDogMutation.isPending || updateDogMutation.isPending}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
                >
                  {createDogMutation.isPending || updateDogMutation.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEdit}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Dogs list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dogs && dogs.length > 0 ? (
            dogs.map((dog: any) => (
              <Card key={dog.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold uppercase text-foreground">{dog.name}</h3>
                  {dog.breed && <p className="text-sm text-muted-foreground">{dog.breed}</p>}
                </div>

                {dog.photoUrls && typeof dog.photoUrls === 'string' && JSON.parse(dog.photoUrls).length > 0 && (
                  <div className="mb-4 rounded-lg overflow-hidden h-48 bg-muted">
                    <img
                      src={JSON.parse(dog.photoUrls)[0]}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {dog.description && (
                  <p className="text-sm text-foreground mb-3">{dog.description}</p>
                )}

                {dog.age && (
                  <p className="text-sm text-muted-foreground mb-3">Âge : {dog.age} ans</p>
                )}

                {dog.personality && typeof dog.personality === 'string' && JSON.parse(dog.personality).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {JSON.parse(dog.personality).map((trait: string) => (
                      <span key={trait} className="px-2 py-1 bg-accent/20 text-accent rounded text-xs font-semibold">
                        {trait}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => startEdit(dog)}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Edit2 size={16} />
                    Modifier
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground mb-4">Aucun chien pour le moment</p>
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
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
