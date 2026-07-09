import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, X, MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";

export default function SwipeHistoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [limit, setLimit] = useState(50);

  const { data: history, isLoading } = trpc.history.getSwipeHistory.useQuery({ limit }, { refetchOnMount: 'always' });
  const addFavoriteMutation = trpc.favorite.addFavorite.useMutation();

  const handleAddFavorite = async (targetUserId: number) => {
    try {
      await addFavoriteMutation.mutateAsync({ targetUserId });
    } catch (error) {
      // Error handled by mutation
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
        <p className="text-gray-600">Chargement de votre historique...</p>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-peach-50 to-white p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-black uppercase mb-2 text-black">Historique des Swipes</h1>
          <p className="text-gray-600 mb-8">Aucun swipe pour le moment</p>
          <Button 
            onClick={() => navigate("/discovery")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Commencer à découvrir
          </Button>
        </div>
      </div>
    );
  }

  const likedProfiles = history.filter((h: any) => h.liked);
  const passedProfiles = history.filter((h: any) => !h.liked);

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black uppercase mb-2 text-black">Historique des Swipes</h1>
        <p className="text-gray-600 mb-8">Total : {history.length} swipes</p>

        {/* Liked Profiles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
            <Heart className="w-6 h-6 fill-red-500 text-red-500" />
            J'aime ({likedProfiles.length})
          </h2>
          
          {likedProfiles.length === 0 ? (
            <p className="text-gray-600">Aucun profil aimé</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {likedProfiles.map((profile: any) => (
                <Card key={profile.targetUserId} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-red-200 to-pink-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-black uppercase">{profile.name}</h3>
                        <p className="text-sm text-gray-700">{profile.age} ans</p>
                      </div>
                      <Heart className="w-6 h-6 fill-red-500 text-red-500" />
                    </div>
                  </div>

                  <div className="p-4">
                    {profile.profilePhotoUrl && (
                      <img
                        src={profile.profilePhotoUrl}
                        alt={profile.name}
                        className="w-full h-48 object-cover rounded-lg mb-4"
                      />
                    )}

                    {profile.bio && (
                      <p className="text-gray-700 mb-4 line-clamp-3">{profile.bio}</p>
                    )}

                    {profile.dogs && profile.dogs.length > 0 && (
                      <div className="mb-4">
                        <p className="font-semibold text-sm mb-2">Chiens :</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.dogs.map((dog: any) => (
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
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddFavorite(profile.targetUserId)}
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Passed Profiles */}
        <div>
          <h2 className="text-2xl font-bold uppercase mb-6 flex items-center gap-2">
            <X className="w-6 h-6 text-gray-400" />
            Pass ({passedProfiles.length})
          </h2>
          
          {passedProfiles.length === 0 ? (
            <p className="text-gray-600">Aucun profil passé</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {passedProfiles.map((profile: any) => (
                <Card key={profile.targetUserId} className="overflow-hidden hover:shadow-lg transition-shadow opacity-75">
                  <div className="bg-gradient-to-r from-gray-200 to-gray-300 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-black uppercase">{profile.name}</h3>
                        <p className="text-sm text-gray-700">{profile.age} ans</p>
                      </div>
                      <X className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>

                  <div className="p-4">
                    {profile.profilePhotoUrl && (
                      <img
                        src={profile.profilePhotoUrl}
                        alt={profile.name}
                        className="w-full h-48 object-cover rounded-lg mb-4 grayscale"
                      />
                    )}

                    {profile.bio && (
                      <p className="text-gray-700 mb-4 line-clamp-3">{profile.bio}</p>
                    )}

                    {profile.dogs && profile.dogs.length > 0 && (
                      <div className="mb-4">
                        <p className="font-semibold text-sm mb-2">Chiens :</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.dogs.map((dog: any) => (
                            <span
                              key={dog.id}
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-medium"
                            >
                              {dog.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleAddFavorite(profile.targetUserId)}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Ajouter aux favoris
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
