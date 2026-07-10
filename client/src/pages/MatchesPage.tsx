import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Users, Star, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { CompatibilityScore } from "@/components/CompatibilityScore";
import DogAvatarFallback from "@/components/DogAvatarFallback";
import { motion, AnimatePresence } from "framer-motion";

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
  const utils = trpc.useUtils();

  // Fetch matches
  const { data: matches, isLoading } = trpc.match.getMatches.useQuery();

  // Block state
  const [selectedUserForBlock, setSelectedUserForBlock] = useState<{ id: number; name: string } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Block mutation
  const blockMutation = trpc.match.blockUser.useMutation({
    onSuccess: () => {
      utils.match.getMatches.invalidate();
    }
  });

  const handleBlock = async (targetUserId: number, isPermanent: boolean) => {
    try {
      await blockMutation.mutateAsync({ targetUserId, isPermanent });
      showToast("success", isPermanent ? "Utilisateur bloqué définitivement." : "Match retiré pour 1 semaine.");
    } catch (error) {
      console.error("Failed to block user:", error);
      showToast("error", "Une erreur est survenue. Veuillez réessayer.");
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
        <div className="flex justify-between items-start mb-8 flex-col sm:flex-row gap-4">
          <div>
            <h1 className="text-4xl font-bold uppercase text-foreground mb-2">Mes Matchs</h1>
            <p className="text-muted-foreground">Vous avez {matches?.length || 0} match{matches && matches.length !== 1 ? 'es' : ''}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/blocked")}
            className="border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all font-black uppercase flex items-center gap-2 cursor-pointer bg-white text-black text-xs px-4 py-2"
          >
            Gérer les profils bloqués
          </Button>
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
                  className={`relative overflow-hidden h-[450px] border-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all group ${
                    match.isFavorite 
                      ? 'border-yellow-400 border-[3px] shadow-[0_0_15px_rgba(250,204,21,0.5),6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[0_0_20px_rgba(250,204,21,0.7),8px_8px_0px_0px_rgba(0,0,0,1)]' 
                      : 'border-black hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]'
                  }`}
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

                  {/* Badge & Actions Top Right */}
                  <div className="absolute top-4 right-4 z-20 flex gap-2 items-center">
                    {match.isFavorite && (
                      <div className="bg-yellow-400 text-black border-2 border-black font-black uppercase text-[10px] px-3 py-1 rounded-full flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                        <Star className="w-3 h-3 fill-black" />
                        Favori
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserForBlock({ id: otherUserId, name: otherUserName });
                      }}
                      className="bg-red-500 hover:bg-red-600 hover:scale-105 active:scale-95 text-white border-2 border-black p-1.5 rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                      title="Bloquer / Retirer ce match"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

      <AnimatePresence>
        {selectedUserForBlock && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background border-4 border-black p-6 rounded-none max-w-md w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-black relative"
            >
              <h3 className="text-2xl font-black uppercase mb-2 tracking-wide">Retirer / Bloquer</h3>
              <p className="text-sm text-gray-700 mb-6 font-medium">
                Voulez-vous retirer {selectedUserForBlock.name} de vos matchs ?
                <br /><br />
                - **Suppression temporaire** : Cache le profil de vos matchs et de votre découverte pendant 7 jours.
                <br />
                - **Blocage définitif** : Cache le profil indéfiniment.
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={async () => {
                    await handleBlock(selectedUserForBlock.id, false);
                    setSelectedUserForBlock(null);
                  }}
                  className="w-full bg-blue-400 hover:bg-blue-500 text-black border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                >
                  Supprimer (1 semaine)
                </Button>

                <Button
                  onClick={async () => {
                    await handleBlock(selectedUserForBlock.id, true);
                    setSelectedUserForBlock(null);
                  }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white border-2 border-black font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
                >
                  Bloquer définitivement
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setSelectedUserForBlock(null)}
                  className="w-full bg-white text-black border-2 border-black hover:bg-neutral-100 font-black uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer animate-none"
                >
                  Annuler
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-none border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-bold text-sm ${
              toast.type === "success"
                ? "bg-green-400 text-black"
                : "bg-red-500 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
