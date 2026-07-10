import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, ShieldAlert, Unlock, Star, Calendar } from "lucide-react";
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

export default function BlockedProfilesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // Fetch blocked users
  const { data: blockedUsers, isLoading } = trpc.match.getBlockedUsers.useQuery(undefined, {
    refetchOnMount: 'always'
  });

  // Unblock mutation
  const unblockMutation = trpc.match.unblockUser.useMutation({
    onSuccess: () => {
      utils.match.getBlockedUsers.invalidate();
      // Also invalidate discovery and matches just in case
      utils.match.getMatches.invalidate();
    }
  });

  const handleUnblock = async (targetUserId: number) => {
    try {
      await unblockMutation.mutateAsync({ targetUserId });
    } catch (error) {
      console.error("Failed to unblock user:", error);
    }
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
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/matches")}
            className="border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold uppercase text-foreground mb-2">Profils Exclus / Bloqués</h1>
            <p className="text-muted-foreground">
              Gérez les profils que vous avez retirés ou bloqués définitivement.
            </p>
          </div>
        </div>

        {blockedUsers && blockedUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blockedUsers.map((blocked: any, index: number) => {
              const dogs = blocked.dogs || [];
              const dogName = dogs.length > 0 ? dogs[0].name : "Son chien";
              const dogBreed = dogs.length > 0 ? dogs[0].breed : "Race inconnue";
              
              const photoList = parsePhotos(dogs.length > 0 ? dogs[0].photoUrls : null);
              const dogPhoto = photoList.length > 0 ? photoList[0] : null;
              
              const isTemp = blocked.type === "temporary";
              const expDate = blocked.expiresAt ? new Date(blocked.expiresAt) : null;

              return (
                <motion.div
                  key={blocked.blockId}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 26 }}
                >
                  <Card className="relative overflow-hidden h-[400px] border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all group hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
                    {/* Background image or placeholder */}
                    {dogPhoto ? (
                      <img
                        src={dogPhoto}
                        alt={dogName}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-peach memphis-dots text-accent flex items-center justify-center">
                        <DogAvatarFallback name={dogName} breed={dogBreed} className="w-20 h-20 rounded-full border-4 border-black" />
                      </div>
                    )}

                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

                    {/* Top Pills */}
                    <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                      <span className={`border-2 border-black font-black uppercase text-[10px] px-3 py-1 rounded-full flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        isTemp 
                          ? 'bg-blue-400 text-black' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {isTemp ? "Suppression Temporaire" : "Blocage Définitif"}
                      </span>

                      {isTemp && expDate && (
                        <span className="bg-white text-black border-2 border-black font-bold text-[9px] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <Calendar className="w-3 h-3" />
                          Expire le {expDate.toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>

                    {/* Content Overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-6 text-white z-10">
                      <div className="mb-4">
                        <h3 className="text-2xl font-black uppercase text-white tracking-wider filter drop-shadow-[1.5px_1.5px_0px_rgba(0,0,0,0.8)]">
                          {dogName}
                        </h3>
                        <p className="text-xs font-semibold text-neutral-300 mt-1 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.8)]">
                          Race : {dogBreed} | Maître : {blocked.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-2">
                          Exclu le {new Date(blocked.blockedAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>

                      <Button
                        onClick={() => handleUnblock(blocked.targetUserId)}
                        className="w-full bg-mint hover:bg-mint/90 text-mint-foreground border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all gap-2 cursor-pointer"
                      >
                        <Unlock size={18} />
                        Débloquer / Réintroduire
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <ShieldAlert size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-2xl font-bold uppercase text-foreground mb-2">Aucun profil bloqué</h2>
            <p className="text-muted-foreground mb-6">
              Tous vos profils exclus sont actifs ou n'ont pas encore été configurés.
            </p>
            <Button
              onClick={() => setLocation("/matches")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-black uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              Retour aux Matchs
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
