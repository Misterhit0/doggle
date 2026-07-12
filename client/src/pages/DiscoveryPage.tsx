import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Heart, X, MapPin, Award, Users, Star, CreditCard, ShieldAlert, Sparkles, CheckCircle } from "lucide-react";
import { useRealTimeGeolocation } from "@/hooks/useRealTimeGeolocation";
import { GeolocationStatus } from "@/components/GeolocationStatus";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { calculateCompatibility, formatCompatibilityScore, getCompatibilityColor } from "@shared/compatibilityEngine";
import DogAvatarFallback from "@/components/DogAvatarFallback";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function DiscoveryPage() {
  const { user, refresh: refreshAuth } = useAuth({ redirectOnUnauthenticated: true });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [radiusKm, setRadiusKm] = useState(5);
  const [breedingOnly, setBreedingOnly] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Payment states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<'extra_favorites' | 'unlimited_swipes' | 'premium_pass'>('premium_pass');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'google_pay' | 'apple_pay'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

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
    breedingOnly,
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

  // Get favorites to check daily limit client-side
  const { data: myFavorites, refetch: refetchFavorites } = trpc.favorite.getFavorites.useQuery(undefined, {
    enabled: !!user,
  });

  const favoritesTodayCount = useMemo(() => {
    if (!myFavorites) return 0;
    const today = new Date().toDateString();
    return myFavorites.filter((fav: any) => new Date(fav.createdAt).toDateString() === today).length;
  }, [myFavorites]);

  // Payment mutation
  const purchasePackageMutation = trpc.payment.purchasePackage.useMutation({
    onSuccess: () => {
      refreshAuth();
      refetchSwipeCount();
      refetchFavorites();
    },
  });

  // Favorite mutation
  const favoriteMutation = trpc.favorite.addFavorite.useMutation({
    onSuccess: () => {
      toast.success("⭐ Ajouté aux favoris !");
      refetchFavorites();
      refreshAuth();
    },
    onError: (error) => {
      if (error.message === "FAVORITE_LIMIT_EXCEEDED") {
        setIsPaymentModalOpen(true);
      } else {
        toast.error("Erreur lors de l'ajout aux favoris");
      }
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
      if (error.message === "SWIPE_LIMIT_EXCEEDED" || error.message === "FAVORITE_LIMIT_EXCEEDED") {
        setIsPaymentModalOpen(true);
      } else {
        toast.error(error.message || "Erreur lors du swipe");
      }
      setCurrentIndex(prev => Math.max(0, prev - 1));
    },
  });

  const bypass = user?.role === 'admin' || user?.bypassPaymentLimits || (user?.swipeLimitUntil && new Date(user.swipeLimitUntil) > new Date());
  const swipesToday = dailySwipeCount ?? 0;
  const favoritesToday = favoritesTodayCount ?? 0;
  const superLikeCredits = user?.superLikeCredits ?? 0;

  const isSwipeLimitReached = swipesToday >= 20;
  const isFavoriteLimitReached = favoritesToday >= 2 && superLikeCredits <= 0;
  const isDiscoveryLocked = !bypass && isSwipeLimitReached && isFavoriteLimitReached;

  const handleSwipe = (liked: boolean) => {
    if (!duos || !duos[currentIndex] || swipeDirection) return;

    if (!bypass && isSwipeLimitReached) {
      setIsPaymentModalOpen(true);
      return;
    }

    if (navigator.vibrate) navigator.vibrate(15);
    liked ? sounds.playLike() : sounds.playPass();

    setSwipeDirection(liked ? 'right' : 'left');
    dragX.set(0);
    const targetUserId = (duos[currentIndex] as any).user.id;

    setTimeout(() => {
      swipeMutation.mutate({
        targetUserId,
        liked,
        isFavorite: false,
      });
      setCurrentIndex(prev => prev + 1);
      setSwipeDirection(null);
    }, 250);
  };

  const handleLike = () => handleSwipe(true);
  const handlePass = () => handleSwipe(false);

  const handleFavorite = () => {
    if (!duos || !(duos as any[])[currentIndex] || swipeDirection) return;

    if (!bypass && isFavoriteLimitReached) {
      setIsPaymentModalOpen(true);
      return;
    }

    const targetUserId = ((duos as any[])[currentIndex] as any).user.id;
    sounds.playFavorite();
    
    setSwipeDirection('right');
    dragX.set(0);

    favoriteMutation.mutate({ targetUserId });

    setTimeout(() => {
      swipeMutation.mutate({
        targetUserId,
        liked: true,
        isFavorite: true,
      });
      setCurrentIndex(prev => prev + 1);
      setSwipeDirection(null);
    }, 250);
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

          {/* Breeding filter */}
          <div className="mt-3 pt-2.5 border-t border-black/10 flex items-center justify-between">
            <label htmlFor="breedingMode" className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-black">🌸 Mode Reproduction</span>
              <span className="text-[10px] text-muted-foreground">Afficher uniquement les chiens ouverts</span>
            </label>
            <div
              className={`w-10 h-5 rounded-full border-2 border-black transition-colors cursor-pointer flex items-center ${breedingOnly ? "bg-pink-400" : "bg-gray-200"}`}
              onClick={() => { setBreedingOnly(prev => !prev); setCurrentIndex(0); refetch(); }}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white border-2 border-black transition-transform ${breedingOnly ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </div>
          </div>
        </Card>

        {/* Card Stack Area */}
        <div className="relative flex-1 min-h-[480px] w-full flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            {isDiscoveryLocked ? (
              <div className="w-full max-w-sm aspect-[3/4.5] flex flex-col justify-center items-center p-8 bg-white/40 backdrop-blur-md border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-2xl text-center relative overflow-hidden group">
                {/* Background Memphis shapes */}
                <div className="absolute top-[-20px] left-[-20px] w-24 h-24 rounded-full bg-peach/25 border border-black/10 z-0" />
                <div className="absolute bottom-[-30px] right-[-30px] w-36 h-36 bg-accent/25 border border-black/10 rotate-45 z-0" />
                
                <div className="z-10 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-yellow-400 border-3 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6 animate-bounce">
                    <Sparkles className="w-10 h-10 text-black fill-black" />
                  </div>
                  <h2 className="text-2xl font-black uppercase text-foreground leading-tight tracking-tight mb-3">
                    Limite quotidienne atteinte 🐾
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold leading-relaxed mb-8 max-w-xs">
                    Vous avez utilisé vos 20 swipes et 2 favoris gratuits pour aujourd'hui. Achetez des crédits ou passez Premium pour continuer à matcher !
                  </p>
                  <Button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black border-3 border-black font-black uppercase tracking-wider text-xs py-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Acheter des Crédits
                  </Button>
                </div>
              </div>
            ) : !isFinished && currentDuo && currentDog && targetUser ? (
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
                        <p className="text-white/75 text-sm font-semibold mt-0.5 flex items-center gap-2">
                          {currentDog.breed || "Race inconnue"}
                          {currentDog.age ? ` • ${currentDog.age} ans` : ""}
                          {/* Breeding badge */}
                          {(currentDog.openToBreeding === true || (currentDog as any).openToBreeding === 1) && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-pink-400 text-white text-[10px] font-black rounded-full border border-white/50">
                              🌸 Reproduction
                            </span>
                          )}
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
        {!isFinished && currentDuo && !isDiscoveryLocked && (
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

      {/* Payment Checkout Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={(open) => {
        if (!isProcessingPayment) {
          setIsPaymentModalOpen(open);
          if (!open) {
            setPaymentSuccess(false);
            setCardNumber('');
            setCardExpiry('');
            setCardCvc('');
          }
        }
      }}>
        <DialogContent className="max-w-md border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase text-foreground tracking-wider flex items-center gap-2">
              <span>💎 Doggle Premium</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase text-muted-foreground">
              Débloquez des swipes ou achetez des favoris
            </DialogDescription>
          </DialogHeader>

          {paymentSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-stamp-pop">
              <div className="w-16 h-16 rounded-full bg-emerald-400 border-3 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
                <CheckCircle className="w-10 h-10 text-black" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-emerald-600 mb-2">Paiement Réussi !</h3>
              <p className="text-xs text-muted-foreground font-semibold max-w-xs mb-6">
                Vos crédits ont été ajoutés à votre compte. Vous pouvez à présent recommencer à swiper et matcher !
              </p>
              <Button
                onClick={() => setIsPaymentModalOpen(false)}
                className="w-full bg-black text-white hover:bg-neutral-800 border-2 border-black font-black uppercase text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] shadow-none active:translate-y-0.5"
              >
                Super, merci !
              </Button>
            </div>
          ) : isProcessingPayment ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Spinner className="w-12 h-12 mb-6" />
              <h4 className="text-sm font-black uppercase tracking-wider text-foreground animate-pulse">{processingStep}</h4>
              <p className="text-[11px] text-muted-foreground font-semibold mt-1">Transaction sécurisée SSL 256 bits</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Packages selection */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-foreground">Choisissez votre formule :</label>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => setSelectedPackage('extra_favorites')}
                    className={`flex items-center justify-between p-3.5 border-2 rounded-xl text-left transition-all ${
                      selectedPackage === 'extra_favorites'
                        ? 'border-yellow-400 bg-yellow-50/70 shadow-[2px_2px_0px_0px_rgba(250,204,21,1)]'
                        : 'border-black hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-black uppercase flex items-center gap-1.5">
                        ⭐ Pack 5 Favoris
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Pour se faire remarquer immédiatement</p>
                    </div>
                    <span className="text-sm font-black bg-white border-2 border-black px-2.5 py-1 rounded-lg">1,99 €</span>
                  </button>

                  <button
                    onClick={() => setSelectedPackage('unlimited_swipes')}
                    className={`flex items-center justify-between p-3.5 border-2 rounded-xl text-left transition-all ${
                      selectedPackage === 'unlimited_swipes'
                        ? 'border-accent bg-accent/10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'border-black hover:bg-neutral-50'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-black uppercase flex items-center gap-1.5">
                        🚀 Swipes Illimités 24h
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Swipez sans aucune limite pendant 24h</p>
                    </div>
                    <span className="text-sm font-black bg-white border-2 border-black px-2.5 py-1 rounded-lg">4,99 €</span>
                  </button>

                  <button
                    onClick={() => setSelectedPackage('premium_pass')}
                    className={`flex items-center justify-between p-3.5 border-3 rounded-xl text-left transition-all relative overflow-hidden ${
                      selectedPackage === 'premium_pass'
                        ? 'border-black bg-peach/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                        : 'border-black hover:bg-neutral-50'
                    }`}
                  >
                    <div className="absolute top-0 right-0 bg-yellow-400 text-black text-[8px] font-black uppercase px-2 py-0.5 border-b-2 border-l-2 border-black">Recommandé</div>
                    <div>
                      <h4 className="text-sm font-black uppercase flex items-center gap-1.5 text-accent-foreground">
                        💎 Passe Premium (24h + 10 Favoris)
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Swipes illimités 24h et 10 super likes offerts</p>
                    </div>
                    <span className="text-sm font-black bg-white border-2 border-black px-2.5 py-1 rounded-lg">9,99 €</span>
                  </button>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-foreground">Moyen de paiement :</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('card')}
                    className={`border-2 border-black text-xs font-black uppercase ${paymentMethod === 'card' ? 'bg-black text-white hover:bg-black/90' : 'bg-white text-black hover:bg-neutral-50'}`}
                  >
                    Carte
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'google_pay' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('google_pay')}
                    className={`border-2 border-black text-xs font-black uppercase ${paymentMethod === 'google_pay' ? 'bg-[#4285F4] text-white hover:bg-[#357AE8]' : 'bg-white text-black hover:bg-neutral-50'}`}
                  >
                    Google Pay
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'apple_pay' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('apple_pay')}
                    className={`border-2 border-black text-xs font-black uppercase ${paymentMethod === 'apple_pay' ? 'bg-black text-white hover:bg-black/90' : 'bg-white text-black hover:bg-neutral-50'}`}
                  >
                    Apple Pay
                  </Button>
                </div>
              </div>

              {/* Payment Details Form */}
              {paymentMethod === 'card' ? (
                <div className="space-y-3 bg-neutral-50 p-4 border-2 border-black rounded-xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Numéro de carte</label>
                    <input
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substring(0, 16))}
                      className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg focus:outline-none focus:ring-1 focus:ring-black bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">Date d'expiration</label>
                      <input
                        type="text"
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value.substring(0, 5))}
                        className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg focus:outline-none focus:ring-1 focus:ring-black bg-white text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-muted-foreground">CVC</label>
                      <input
                        type="password"
                        placeholder="123"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 3))}
                        className="w-full text-xs font-bold p-2.5 border-2 border-black rounded-lg focus:outline-none focus:ring-1 focus:ring-black bg-white text-center"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-50 p-6 border-2 border-black rounded-xl text-center">
                  <p className="text-xs font-bold text-muted-foreground">
                    Cliquez sur le bouton ci-dessous pour confirmer l'achat instantané sécurisé avec votre compte {paymentMethod === 'apple_pay' ? 'Apple' : 'Google'}.
                  </p>
                </div>
              )}

              {/* Checkout CTA */}
              <Button
                onClick={async () => {
                  if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvc)) {
                    toast.error("Veuillez remplir les informations de carte bancaire");
                    return;
                  }
                  setIsProcessingPayment(true);
                  
                  // Mock processing steps
                  const steps = [
                    "Communication avec la banque...",
                    "Sécurisation de la transaction...",
                    "Finalisation du paiement..."
                  ];
                  for (let i = 0; i < steps.length; i++) {
                    setProcessingStep(steps[i]);
                    await new Promise(r => setTimeout(r, 800));
                  }

                  try {
                    await purchasePackageMutation.mutateAsync({
                      packageType: selectedPackage,
                      paymentMethod: paymentMethod,
                    });
                    sounds.playMatch(); // Celebratory chime
                    setPaymentSuccess(true);
                    toast.success("Achat premium effectué avec succès !");
                  } catch (err: any) {
                    toast.error("Échec du paiement : " + (err.message || "Erreur inconnue"));
                  } finally {
                    setIsProcessingPayment(false);
                  }
                }}
                className={`w-full text-xs font-black uppercase py-6 border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                  paymentMethod === 'google_pay' 
                    ? 'bg-[#4285F4] hover:bg-[#357AE8] text-white' 
                    : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                Confirmer le paiement - {selectedPackage === 'extra_favorites' ? '1,99 €' : selectedPackage === 'unlimited_swipes' ? '4,99 €' : '9,99 €'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


