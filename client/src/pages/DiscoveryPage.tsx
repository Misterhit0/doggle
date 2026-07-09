import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Heart, X, MapPin, Award, Users, Star } from "lucide-react";
import { useRealTimeGeolocation } from "@/hooks/useRealTimeGeolocation";
import { GeolocationStatus } from "@/components/GeolocationStatus";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { calculateCompatibility, formatCompatibilityScore, getCompatibilityColor } from "@shared/compatibilityEngine";
import DogAvatarFallback from "@/components/DogAvatarFallback";

export default function DiscoveryPage() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [radiusKm, setRadiusKm] = useState(5);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const dragX = useMotionValue(0);
  const cardRotate = useTransform(dragX, [-220, 220], [-18, 18]);
  const likeOpacity = useTransform(dragX, [40, 130], [0, 1]);
  const nopeOpacity = useTransform(dragX, [-130, -40], [1, 0]);
  const bgTint = useTransform(
    dragX,
    [-180, 0, 180],
    ['rgba(239,68,68,0.14)', 'rgba(0,0,0,0)', 'rgba(34,197,94,0.14)']
  );

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

  // Daily swipe counter
  const { data: dailySwipeCount, refetch: refetchSwipeCount } = trpc.discovery.getDailySwipeCount.useQuery(undefined, {
    enabled: !!user,
  });

  // Favorite mutation
  const favoriteMutation = trpc.favorite.addFavorite.useMutation({
    onSuccess: () => {
      toast.success("⭐ Ajouté aux favoris !");
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout aux favoris");
    },
  });

  // Swipe mutation
  const swipeMutation = trpc.discovery.swipe.useMutation({
    onSuccess: (result) => {
      refetchSwipeCount();
      setPhotoIndex(0);
      if (result.matched) {
        sounds.playMatch();
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

    if (navigator.vibrate) navigator.vibrate(15);
    liked ? sounds.playLike() : sounds.playPass();

    setSwipeDirection(liked ? 'right' : 'left');
    dragX.set(0);
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

  const handleFavorite = () => {
    if (!duos || !(duos as any[])[currentIndex] || swipeDirection) return;
    const targetUserId = ((duos as any[])[currentIndex] as any).user.id;
    sounds.playFavorite();
    favoriteMutation.mutate({ targetUserId });
    handleSwipe(true);
  };

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

                {/* 2. Top active card — drag-to-swipe */}
                <motion.div
                  key={targetUser.id}
                  style={{ x: dragX, rotate: cardRotate, zIndex: 20 }}
                  initial={{ scale: 0.96, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{
                    x: swipeDirection === 'right' ? 520 : swipeDirection === 'left' ? -520 : 0,
                    rotate: swipeDirection === 'right' ? 20 : swipeDirection === 'left' ? -20 : 0,
                    opacity: 0,
                    transition: { duration: 0.28, ease: 'easeOut' }
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.9}
                  onDragStart={() => sounds.playTap()}
                  onDragEnd={(_, info) => {
                    const vx = info.velocity.x;
                    const offset = info.offset.x;
                    if (offset > 100 || vx > 500) {
                      handleSwipe(true);
                    } else if (offset < -100 || vx < -500) {
                      handleSwipe(false);
                    } else {
                      dragX.set(0);
                    }
                  }}
                  className="w-full h-full flex flex-col relative cursor-grab active:cursor-grabbing select-none"
                >
                  {/* Background tint driven by drag */}
                  <motion.div
                    style={{ backgroundColor: bgTint }}
                    className="absolute inset-0 rounded-xl pointer-events-none z-0"
                  />

                  <Card className="overflow-hidden border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col relative bg-black">

                    {/* LIKE overlay */}
                    <motion.div
                      style={{ opacity: likeOpacity }}
                      className="absolute top-8 left-6 z-30 border-4 border-emerald-400 text-emerald-400 font-black uppercase text-3xl px-3 py-1.5 rounded-lg tracking-wider bg-black/60 shadow-lg pointer-events-none"
                      aria-hidden
                    >
                      J'AIME ❤️
                    </motion.div>

                    {/* NOPE overlay */}
                    <motion.div
                      style={{ opacity: nopeOpacity }}
                      className="absolute top-8 right-6 z-30 border-4 border-red-400 text-red-400 font-black uppercase text-3xl px-3 py-1.5 rounded-lg tracking-wider bg-black/60 shadow-lg pointer-events-none"
                      aria-hidden
                    >
                      NOPE 👋
                    </motion.div>

                    {/* Button swipe stamps */}
                    {swipeDirection === 'right' && (
                      <div className="absolute top-8 left-6 z-30 border-4 border-emerald-400 text-emerald-400 font-black uppercase text-3xl px-3 py-1.5 rounded-lg tracking-wider bg-black/60 animate-stamp-pop pointer-events-none">
                        J'AIME ❤️
                      </div>
                    )}
                    {swipeDirection === 'left' && (
                      <div className="absolute top-8 right-6 z-30 border-4 border-red-400 text-red-400 font-black uppercase text-3xl px-3 py-1.5 rounded-lg rotate-[12deg] tracking-wider bg-black/60 animate-stamp-pop-right pointer-events-none">
                        NOPE 👋
                      </div>
                    )}

                    {/* Full-bleed photo */}
                    <div className="relative w-full flex-1 overflow-hidden">
                      {(() => {
                        const photos = parseJsonField(currentDog.photoUrls);
                        const src = photos[photoIndex] || photos[0];
                        return src ? (
                          <img
                            src={src}
                            alt={currentDog.name}
                            className="w-full h-full object-cover pointer-events-none"
                            draggable={false}
                          />
                        ) : (
                          <DogAvatarFallback name={currentDog.name} breed={currentDog.breed} className="w-full h-full" />
                        );
                      })()}

                      {/* Photo gallery dots + tap zones */}
                      {parseJsonField(currentDog.photoUrls).length > 1 && (
                        <>
                          {/* Tap left / right to change photo */}
                          <button
                            className="absolute left-0 top-0 h-full w-1/3 z-10 opacity-0"
                            onClick={(e) => { e.stopPropagation(); setPhotoIndex(i => Math.max(0, i - 1)); }}
                            aria-label="Photo précédente"
                          />
                          <button
                            className="absolute right-0 top-0 h-full w-1/3 z-10 opacity-0"
                            onClick={(e) => { e.stopPropagation(); setPhotoIndex(i => Math.min(parseJsonField(currentDog.photoUrls).length - 1, i + 1)); }}
                            aria-label="Photo suivante"
                          />
                          {/* Dots indicator */}
                          <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                            {parseJsonField(currentDog.photoUrls).map((_: string, i: number) => (
                              <div
                                key={i}
                                className={`h-1 rounded-full transition-all duration-200 ${i === photoIndex ? 'w-6 bg-white' : 'w-2 bg-white/50'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Compatibility badge */}
                      <div className="absolute top-4 right-4 z-20">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-black bg-white/95 backdrop-blur-sm rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[11px] font-black text-black leading-none">
                            {compatibility.overallScore}%
                          </span>
                        </div>
                      </div>

                      {/* Bottom gradient overlay with info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 z-10">
                        {/* Owner chip */}
                        <div className="flex items-center gap-2 mb-2">
                          {targetUser.profilePhotoUrl ? (
                            <img src={targetUser.profilePhotoUrl} alt={targetUser.name} className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-accent border-2 border-white flex items-center justify-center">
                              <span className="text-[10px] font-black text-white">{targetUser.name?.substring(0, 1)}</span>
                            </div>
                          )}
                          <span className="text-white/90 text-xs font-bold">{targetUser.name?.split(" ")[0]}</span>
                        </div>

                        {/* Dog name + breed */}
                        <h2 className="text-white text-3xl font-black uppercase leading-tight tracking-tight">
                          {currentDog.name}
                        </h2>
                        <p className="text-white/75 text-sm font-semibold mt-0.5">
                          {currentDog.breed || "Race inconnue"}
                          {currentDog.age ? ` • ${currentDog.age} ans` : ""}
                        </p>

                        {/* Affinities */}
                        {affinities && affinities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {affinities.slice(0, 3).map((aff: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 bg-yellow-400/90 text-black rounded text-[10px] font-black uppercase">
                                {aff}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Traits */}
                        {currentDog.personality && parseJsonField(currentDog.personality).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {parseJsonField(currentDog.personality).slice(0, 4).map((trait: string) => (
                              <span key={trait} className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white rounded text-[10px] font-semibold border border-white/30">
                                {trait}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
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
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex gap-5 justify-center items-center">
              <motion.button
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.08 }}
                onClick={handlePass}
                disabled={swipeMutation.isPending || !!swipeDirection}
                className="w-16 h-16 rounded-full border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white flex items-center justify-center disabled:opacity-50"
                aria-label="Passer"
              >
                <X size={28} className="text-red-500 stroke-[3px]" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.08 }}
                onClick={handleFavorite}
                disabled={swipeMutation.isPending || favoriteMutation.isPending || !!swipeDirection}
                className="w-12 h-12 rounded-full border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-yellow-400 flex items-center justify-center disabled:opacity-50"
                aria-label="Ajouter aux favoris"
              >
                <Star size={22} fill="currentColor" className="text-black stroke-[2px]" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.08 }}
                onClick={handleLike}
                disabled={swipeMutation.isPending || !!swipeDirection}
                className="w-16 h-16 rounded-full border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-accent flex items-center justify-center disabled:opacity-50"
                aria-label="J'aime"
              >
                <Heart size={28} fill="currentColor" className="text-accent-foreground stroke-[2px]" />
              </motion.button>
            </div>
            {dailySwipeCount !== undefined && (
              <p className="text-xs text-muted-foreground font-semibold tracking-wide">
                {dailySwipeCount} swipe{dailySwipeCount !== 1 ? "s" : ""} aujourd'hui
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}


