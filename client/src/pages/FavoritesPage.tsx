import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Trash2, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function FavoritesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [removingId, setRemovingId] = useState<number | null>(null);

  const { data: favorites, isLoading, refetch } = trpc.favorite.getFavorites.useQuery();
  const removeFavoriteMutation = trpc.favorite.removeFavorite.useMutation();

  const handleRemoveFavorite = async (targetUserId: number) => {
    setRemovingId(targetUserId);
    try {
      await removeFavoriteMutation.mutateAsync({ targetUserId });
      toast.success("Profil retiré des favoris");
      refetch();
    } catch (error) {
      toast.error("Erreur lors du retrait du favori");
    } finally {
      setRemovingId(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Chargement de vos favoris...</p>
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-peach-50 to-white p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black uppercase mb-2 text-black">Mes Favoris</h1>
          <p className="text-gray-600 mb-8">Aucun profil favori pour le moment</p>
          <Button 
            onClick={() => navigate("/discovery")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Découvrir des profils
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black uppercase mb-2 text-black">Mes Favoris</h1>
        <p className="text-gray-600 mb-8">{favorites.length} profil{favorites.length > 1 ? "s" : ""} sauvegardé{favorites.length > 1 ? "s" : ""}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {favorites.map((favorite: any) => (
            <Card key={favorite.targetUserId} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-r from-lilac-200 to-mint-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-black uppercase">{favorite.name}</h3>
                    <p className="text-sm text-gray-700">{favorite.age} ans</p>
                  </div>
                  <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                </div>
              </div>

              <div className="p-4">
                {favorite.profilePhotoUrl && (
                  <img
                    src={favorite.profilePhotoUrl}
                    alt={favorite.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}

                {favorite.bio && (
                  <p className="text-gray-700 mb-4 line-clamp-3">{favorite.bio}</p>
                )}

                {favorite.dogs && favorite.dogs.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold text-sm mb-2">Chiens :</p>
                    <div className="flex flex-wrap gap-2">
                      {favorite.dogs.map((dog: any) => (
                        <span
                          key={dog.id}
                          className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium"
                        >
                          {dog.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/matches`)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contacter
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveFavorite(favorite.targetUserId)}
                    disabled={removingId === favorite.targetUserId}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
