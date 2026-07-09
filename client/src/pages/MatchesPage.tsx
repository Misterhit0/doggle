import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Users } from "lucide-react";
import { CompatibilityScore } from "@/components/CompatibilityScore";
import DogAvatarFallback from "@/components/DogAvatarFallback";
import { motion } from "framer-motion";

const parsePhotos = (photoUrls: any): string[] => {
  if (!photoUrls) return [];
  if (Array.isArray(photoUrls)) return photoUrls;
  if (typeof photoUrls === "string") {
    try {
      return JSON.parse(photoUrls);
    } catch {
      return [];
    }
  }
  return [];
};

export default function MatchesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch matches
  const { data: matches, isLoading } = trpc.match.getMatches.useQuery();

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold uppercase text-foreground mb-2">Mes Matchs</h1>
          <p className="text-muted-foreground">Vous avez {matches?.length || 0} match{matches && matches.length !== 1 ? 'es' : ''}</p>
        </div>

        {matches && matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map((match: any, index: number) => {
              // Determine if current user is user1 or user2
              const currentUserId = Number(user?.id);
              const isUser1 = Number(match.user1Id) === currentUserId;
              const otherUserId = isUser1 ? Number(match.user2Id) : Number(match.user1Id);
              const otherUserName = isUser1 ? match.user2Name : match.user1Name;

              // Get dog details
              const dog = match.otherDog;
              const dogName = dog?.name || "Son chien";
              const dogBreed = dog?.breed || "Race inconnue";
              const dogAge = dog?.age;

              const photoList = parsePhotos(dog?.photoUrls);
              const dogPhoto = photoList.length > 0 ? photoList[0] : null;

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, type: "spring", stiffness: 320, damping: 28 }}
                >
                <Card
                  key={match.id} 
                  className="relative overflow-hidden h-[450px] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all group"
                >
                  {/* Background Image / Placeholder */}
                  {dogPhoto ? (
                    <img
                      src={dogPhoto}
                      alt={dogName}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-peach memphis-dots text-accent flex items-center justify-center">
                      <DogAvatarFallback name={dogName} breed={dogBreed} className="w-24 h-24 rounded-full border-4 border-black" />
                    </div>
                  )}

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

                  {/* Top pill for Compatibility Score */}
                  <div className="absolute top-4 left-4 z-10">
                    <CompatibilityScore score={match.compatibilityScore} compact={true} />
                  </div>

                  {/* Card Content Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6 text-white z-10">
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black uppercase text-white tracking-wider filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)]">
                          {dogName}
                        </h3>
                        {dogAge !== undefined && (
                          <span className="text-xl font-bold text-yellow-300 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
                            {dogAge} ans
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-bold uppercase tracking-wider text-neutral-300 mt-1 flex items-center gap-1 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
                        {dogBreed}
                      </p>
                      
                      <div className="mt-2 text-xs font-semibold text-mint flex items-center gap-1.5 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
                        <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
                        Maître : {otherUserName}
                      </div>

                      <p className="text-[10px] text-neutral-400 mt-2 flex items-center gap-1">
                        Matché le {new Date(match.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 mt-2">
                      <Button
                        onClick={() => setLocation(`/conversation/${match.id}`)}
                        className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all gap-2"
                      >
                        <MessageCircle size={18} />
                        Discuter
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 bg-white text-black border-2 border-black hover:bg-neutral-100 font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all gap-2"
                        onClick={() => setLocation(`/profile/${otherUserId}`)}
                      >
                        <Users size={18} />
                        Profil
                      </Button>
                    </div>
                  </div>
                </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Heart size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-2xl font-bold uppercase text-foreground mb-2">Aucun match pour le moment</h2>
            <p className="text-muted-foreground mb-6">
              Commencez à découvrir des duos pour trouver vos matchs!
            </p>
            <Button
              onClick={() => setLocation('/discovery')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
            >
              Découvrir maintenant
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
