import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Heart, X, MapPin, Loader2, Award, Users } from "lucide-react";
import { useRealTimeGeolocation } from "@/hooks/useRealTimeGeolocation";
import { GeolocationStatus } from "@/components/GeolocationStatus";
import { motion, AnimatePresence } from "framer-motion";
import { calculateCompatibility, formatCompatibilityScore, getCompatibilityColor } from "@shared/compatibilityEngine";
import DogAvatarFallback from "@/components/DogAvatarFallback";

export default function DiscoveryPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [radiusKm, setRadiusKm] = useState(5);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const geolocation = useRealTimeGeolocation({
    enabled: true,
    updateIntervalMs: 30000,
  });

  // Fetch nearby duos
  const { data: duos, isLoading, refetch } = trpc.discovery.getNearbyDuos.useQuery({
    radiusKm,
  }, {
    enabled: !!user,
  });

  // Fetch logged-in user's dogs
  const { data: myDogs } = trpc.dog.getMyDogs.useQuery(undefined, {
    enabled: !!user,
  });

  // Auto-refresh nearby duos when geolocation updates
  useEffect(() => {
    if (autoRefreshEnabled && geolocation.isWatching) {
      const interval = setInterval(() => {
        refetch();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [autoRefreshEnabled, geolocation.isWatching, refetch]);

  // Swipe mutation
  const swipeMutation = trpc.discovery.swipe.useMutation({
    onSuccess: (result) => {
      if (result.matched) {
        toast.success("🎉 Nouveau match ! Allez voir vos matchs pour commencer à discuter.");
        if (navigator.vibrate) {
          navigator.vibrate([40, 80, 40]);
        }
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors du swipe");
      setCurrentIndex(prev => Math.max(0, prev - 1));
    },
  });

  const handleSwipe = (liked: boolean) => {
    if (!duos || !duos[currentIndex] || swipeDirection) return;

    if (navigator.vibrate) {
      navigator.vibrate(15);
    }

    setSwipeDirection(liked ? 'right' : 'left');
    const targetUserId = (duos[currentIndex] as any).user.id;

    setTimeout(() => {
      swipeMutation.mutate({
        targetUserId,
        liked,
      });
      setCurrentIndex(prev => prev + 1);
      setSwipeDirection(null);
    }, 250);
  };

  const handleLike = () => handleSwipe(true);
  const handlePass = () => handleSwipe(false);

  const parseJsonField = (field: any) => {
    if (!field) return [];
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        return [];
      }
    }
    return field;
  };

  const currentDuo = duos && duos[currentIndex] as any;
  const nextDuo = duos && duos[currentIndex + 1] as any;
  const isFinished = !duos || currentIndex >= duos.length;

  const currentDog = currentDuo?.dogs?.[0];
  const targetUser = currentDuo?.user;
  const myDog = myDogs?.[0];

  const getCompatibilityScore = (dog: any, owner: any) => {
    if (!myDog || !dog || !user || !owner) {
      return { overallScore: 50 };
    }
    return calculateCompatibility(
      {
        breed: myDog.breed || undefined,
        age: myDog.age || undefined,
        personality: parseJsonField(myDog.personality),
      },
      {
        age: user.age || undefined,
        interests: parseJsonField(user.interests),
        walkingHabits: user.walkingHabits ? [user.walkingHabits] : undefined,
        whatISeek: parseJsonField(user.whatISeek),
      },
      {
        breed: dog.breed || undefined,
        age: dog.age || undefined,
        personality: parseJsonField(dog.personality),
      },
      {
        age: owner.age || undefined,
        interests: parseJsonField(owner.interests),
        walkingHabits: owner.walkingHabits ? [owner.walkingHabits] : undefined,
        whatISeek: parseJsonField(owner.whatISeek),
      }
    );
  };

  const compatibility = useMemo(() => {
    if (currentDuo?.compatibility) {
      return currentDuo.compatibility;
    }
    return getCompatibilityScore(currentDog, targetUser);
  }, [currentDuo, currentDog, targetUser, myDog, user]);

  const affinities = currentDuo?.affinities || [];


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 md:py-12">
      <div className="container max-w-lg px-4 flex flex-col min-h-[calc(100vh-140px)] justify-between">
        
        {/* Header Summary */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black uppercase text-foreground tracking-tight">Découverte</h1>
              <p className="text-xs text-muted-foreground font-bold">Duos chien+maître à proximité</p>
            </div>
            {/* Geolocation compact widget */}
            <GeolocationStatus compact={true} />
          </div>
        </div>

        {/* Radius Selector */}
        <Card className="p-3 mb-4 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white">
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-accent" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-black text-foreground uppercase tracking-wider">
                  Rayon : {radiusKm} km
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="autoRefresh"
                    checked={autoRefreshEnabled && geolocation.isWatching}
                    onChange={(e) => {
                      if (e.target.checked && !geolocation.isWatching) {
                        geolocation.requestGeolocationPermission();
                        setAutoRefreshEnabled(true);
                      } else {
                        setAutoRefreshEnabled(e.target.checked);
                      }
                    }}
                    className="w-3.5 h-3.5 border border-black accent-accent rounded"
                  />
                  <label htmlFor="autoRefresh" className="text-[9px] font-black text-foreground cursor-pointer uppercase">
                    Auto-refresh
                  </label>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={radiusKm}
                onChange={(e) => {
                  setRadiusKm(parseInt(e.target.value));
                  setCurrentIndex(0);
                  refetch();
                }}
                className="w-full h-1.5 bg-muted rounded appearance-none cursor-pointer accent-accent"
              />
            </div>
          </div>
        </Card>

        {/* Card Stack Area */}
        <div className="relative flex-1 min-h-[480px] w-full flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            {!isFinished && currentDuo && currentDog && targetUser ? (
              <div className="w-full relative h-full flex flex-col justify-between">
                
                {/* 1. Behind card preview */}
                {nextDuo && nextDuo.dogs?.[0] && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-45 origin-bottom transition-all duration-300"
                    style={{
                      transform: 'translateY(12px) scale(0.96) rotate(-1.5deg)',
                      zIndex: 10
                    }}
                  >
                    <Card className="overflow-hidden border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] bg-card h-full flex flex-col">
                      <div className="w-full flex-1 bg-muted relative overflow-hidden">
                        {nextDuo.dogs[0].photoUrls && parseJsonField(nextDuo.dogs[0].photoUrls).length > 0 ? (
                          <img
                            src={parseJsonField(nextDuo.dogs[0].photoUrls)[0]}
                            alt={nextDuo.dogs[0].name}
                            className="w-full h-full object-cover grayscale"
                          />
                        ) : (
                          <DogAvatarFallback name={nextDuo.dogs[0].name} breed={nextDuo.dogs[0].breed} className="w-full h-full" />
                        )}
                      </div>
                      <div className="p-4 border-t-3 border-black bg-white">
                        <h3 className="text-xl font-black uppercase text-foreground/50">{nextDuo.dogs[0].name}</h3>
                        <p className="text-xs font-bold text-muted-foreground/50">{nextDuo.dogs[0].breed}</p>
                      </div>
                    </Card>
                  </div>
                )}

                {/* 2. Top active card */}
                <motion.div
                  key={targetUser.id}
                  initial={{ scale: 0.96, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{
                    x: swipeDirection === 'right' ? 450 : swipeDirection === 'left' ? -450 : 0,
                    rotate: swipeDirection === 'right' ? 12 : swipeDirection === 'left' ? -12 : 0,
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: 0.25 }
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="w-full h-full flex flex-col relative"
                  style={{ zIndex: 20 }}
                >
                  <Card className="overflow-hidden border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card h-full flex flex-col relative">
                    
                    {/* Stamp Indicator Overlays */}
                    {swipeDirection === 'right' && (
                      <div className="absolute top-6 left-6 z-30 border-4 border-emerald-500 text-emerald-500 font-black uppercase text-3xl px-3 py-1.5 rounded-lg rotate-[-12deg] tracking-wider bg-white/95 shadow-md">
                        J'AIME
                      </div>
                    )}
                    {swipeDirection === 'left' && (
                      <div className="absolute top-6 right-6 z-30 border-4 border-red-500 text-red-500 font-black uppercase text-3xl px-3 py-1.5 rounded-lg rotate-[12deg] tracking-wider bg-white/95 shadow-md">
                        PASSER
                      </div>
                    )}

                    {/* Dog Photo / Fallback Visual */}
                    <div className="w-full flex-1 bg-muted relative overflow-hidden">
                      {currentDog.photoUrls && parseJsonField(currentDog.photoUrls).length > 0 ? (
                        <img
                          src={parseJsonField(currentDog.photoUrls)[0]}
                          alt={currentDog.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <DogAvatarFallback name={currentDog.name} breed={currentDog.breed} className="w-full h-full" />
                      )}

                      {/* Unified Compatibility Badge Floating on Photo */}
                      <div className="absolute top-4 right-4 z-20">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-white rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <Award className="w-4 h-4 text-amber-500" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase text-muted-foreground leading-none">Compatibilité</span>
                            <span className="text-[11px] font-black text-black leading-none mt-0.5">
                              {compatibility.overallScore}% • {formatCompatibilityScore(compatibility.overallScore)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Unified Bottom Info Panel */}
                    <div className="p-5 border-t-3 border-black bg-white">
                      
                      {/* Dog Details & Age */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h2 className="text-2xl font-black uppercase text-foreground leading-tight">{currentDog.name}</h2>
                          <p className="text-xs text-muted-foreground font-black uppercase">
                            {currentDog.breed || "Race inconnue"} • {currentDog.age ? `${currentDog.age} ans` : "Âge inconnu"}
                          </p>
                        </div>
                        {/* Owner Miniature Row */}
                        <div className="flex items-center gap-2 px-2.5 py-1 border-2 border-black bg-peach-50 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {targetUser.profilePhotoUrl ? (
                            <img
                              src={targetUser.profilePhotoUrl}
                              alt={targetUser.name}
                              className="w-6 h-6 rounded-full border border-black object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-accent border border-black flex items-center justify-center">
                              <span className="text-[8px] font-black">{targetUser.name?.substring(0, 1)}</span>
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-muted-foreground uppercase leading-none">Maître</span>
                            <span className="text-[9px] font-black text-foreground leading-none mt-0.5">{targetUser.name?.split(" ")[0]}</span>
                          </div>
                        </div>
                      </div>

                      {/* Dog Bio */}
                      {currentDog.description && (
                        <p className="text-xs text-foreground/80 font-medium line-clamp-2 mb-3 bg-muted/30 p-2 rounded border border-black/5">
                          "{currentDog.description}"
                        </p>
                      )}

                      {/* Affinities (Atomes crochus) */}
                      {affinities && affinities.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[9px] font-black text-neutral-400 uppercase tracking-wider mb-1 leading-none">
                            Atomes crochus
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {affinities.map((aff: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 border border-black bg-yellow-100 text-yellow-900 rounded text-[9px] font-black uppercase shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
                              >
                                {aff}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dog Traits tags */}
                      {currentDog.personality && parseJsonField(currentDog.personality).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {parseJsonField(currentDog.personality).map((trait: string) => (
                            <span key={trait} className="px-2.5 py-0.5 border border-black bg-accent/15 text-foreground rounded text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              </div>
            ) : (
              <Card className="p-10 text-center border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white w-full max-w-sm">
                <Users size={44} className="mx-auto mb-4 text-muted-foreground/30" />
                <h2 className="text-xl font-black uppercase text-foreground mb-2">
                  {isFinished ? "Fin de la découverte" : "Aucun duo trouvé"}
                </h2>
                <p className="text-xs text-muted-foreground mb-6 font-medium">
                  {isFinished
                    ? "Vous avez vu tous les duos à proximité. Revenez plus tard !"
                    : "Augmentez le rayon de recherche ou activez le GPS."}
                </p>
                <Button
                  onClick={() => {
                    setCurrentIndex(0);
                    refetch();
                  }}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] transition-all uppercase text-xs"
                >
                  Réessayer
                </Button>
              </Card>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Action Buttons below card */}
        {!isFinished && currentDuo && (
          <div className="flex gap-8 justify-center py-4">
            <Button
              onClick={handlePass}
              disabled={swipeMutation.isPending || !!swipeDirection}
              className="w-14 h-14 rounded-full border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-50 text-foreground bg-white active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center"
              aria-label="Passer"
            >
              <X size={26} className="text-red-500 stroke-[3px]" />
            </Button>
            <Button
              onClick={handleLike}
              disabled={swipeMutation.isPending || !!swipeDirection}
              className="w-14 h-14 rounded-full border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-accent hover:bg-accent/90 text-accent-foreground active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center"
              aria-label="J'aime"
            >
              <Heart size={26} fill="currentColor" className="stroke-[3px]" />
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}


