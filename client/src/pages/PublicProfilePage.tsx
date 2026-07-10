import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Dog, Heart } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const targetUserId = Number(userId);

  const { data: profile, isLoading } = trpc.user.getPublicProfile.useQuery(
    { targetUserId },
    { enabled: !isNaN(targetUserId) }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Chargement du profil...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-peach-50 to-white p-4 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600 font-semibold">Profil non disponible.</p>
        <Button variant="outline" onClick={() => setLocation("/matches")}>
          <ArrowLeft size={16} className="mr-2" /> Retour aux matchs
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4 font-black uppercase"
          onClick={() => setLocation("/matches")}
        >
          <ArrowLeft size={16} className="mr-2" /> Retour
        </Button>

        <Card className="overflow-hidden border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {/* Header */}
          <div className="bg-gradient-to-r from-lilac-200 to-mint-200 p-6">
            <div className="flex items-start gap-4">
              {profile.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt={profile.name ?? "Profil"}
                  className="w-20 h-20 rounded-full object-cover border-2 border-black"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white border-2 border-black flex items-center justify-center">
                  <span className="text-3xl">🐾</span>
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-black uppercase">{profile.name}</h1>
                {profile.age && <p className="text-gray-700">{profile.age} ans</p>}
                {profile.isMatched && (
                  <span className="inline-flex items-center gap-1 text-xs font-black uppercase bg-accent text-accent-foreground px-2 py-1 rounded-full mt-1">
                    <Heart size={12} fill="currentColor" /> Match
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="p-6 border-b-2 border-black">
              <h2 className="font-black uppercase text-sm mb-2">À propos</h2>
              <p className="text-gray-700">{profile.bio}</p>
            </div>
          )}

          {/* Habitudes */}
          {(profile.walkingHabits || profile.whatISeek || (profile.interests && profile.interests.length > 0)) && (
            <div className="p-6 border-b-2 border-black space-y-3">
              {profile.walkingHabits && (
                <div>
                  <span className="font-black uppercase text-xs text-gray-500">Habitudes de balade</span>
                  <p className="text-gray-800">{profile.walkingHabits}</p>
                </div>
              )}
              {profile.whatISeek && (
                <div>
                  <span className="font-black uppercase text-xs text-gray-500">Ce que je cherche</span>
                  <p className="text-gray-800">{profile.whatISeek}</p>
                </div>
              )}
              {profile.interests && profile.interests.length > 0 && (
                <div>
                  <span className="font-black uppercase text-xs text-gray-500">Centres d'intérêt</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile.interests.map((interest: string) => (
                      <span key={interest} className="text-xs bg-white border-2 border-black font-bold px-2 py-1 rounded-full">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chiens */}
          {profile.dogs && profile.dogs.length > 0 && (
            <div className="p-6">
              <h2 className="font-black uppercase text-sm mb-3 flex items-center gap-2">
                <Dog size={16} /> {profile.dogs.length > 1 ? "Les chiens" : "Le chien"}
              </h2>
              <div className="space-y-3">
                {profile.dogs.map((dog: any) => (
                  <div key={dog.id} className="flex items-center gap-3 bg-white border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    {dog.photos?.[0] ? (
                      <img
                        src={dog.photos[0]}
                        alt={dog.name}
                        className="w-14 h-14 rounded-lg object-cover border border-black"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-peach-100 border border-black flex items-center justify-center text-2xl">
                        🐶
                      </div>
                    )}
                    <div>
                      <p className="font-black uppercase">{dog.name}</p>
                      {dog.breed && <p className="text-sm text-gray-600">{dog.breed}</p>}
                      {dog.age && <p className="text-xs text-gray-500">{dog.age} ans</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
