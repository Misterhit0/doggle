import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Heart, Dog, Users, Sparkles, AlertTriangle } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { motion, useReducedMotion, useScroll, useTransform, useMotionValueEvent, type Variants } from "framer-motion";
import { useState } from "react";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Curated, verified dog photography (Unsplash). No stock "fake screenshot" divs.
const IMG = {
  hero: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=1400&auto=format&fit=crop",
  profile: "https://images.unsplash.com/photo-1544568100-847a948585b9?q=80&w=800&auto=format&fit=crop",
  swipe: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=800&auto=format&fit=crop",
  connect: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=800&auto=format&fit=crop",
  mission: "https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?q=80&w=1000&auto=format&fit=crop",
  lostDogs: "https://images.unsplash.com/photo-1568572933382-74d440642117?q=80&w=1600&auto=format&fit=crop",
  cta: "https://images.unsplash.com/photo-1601979031925-424e53b6caaa?q=80&w=1000&auto=format&fit=crop",
};

// Threshold-cross flag only (not continuous state), driven by Motion's scroll
// value rather than a raw `window.addEventListener("scroll")` listener.
function useScrolled(threshold = 8) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(() => scrollY.get() > threshold);
  useMotionValueEvent(scrollY, "change", latest => {
    setScrolled(latest > threshold);
  });
  return scrolled;
}

// Scroll-triggered reveal, once per element. GPU-only (opacity + transform).
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const variants: Variants = {
    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0.3 : 0.6, delay, ease: EASE_OUT },
    },
  };
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const reduceMotion = useReducedMotion();
  const scrolled = useScrolled();

  const { scrollY } = useScroll();
  const heroPhotoY = useTransform(scrollY, [0, 600], [0, reduceMotion ? 0 : -40]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Navigation — translucent chrome, content scrolls under it.
          Two stacked layers cross-fade on opacity (GPU-safe) instead of
          transitioning background-color/box-shadow directly (paint-triggering). */}
      <nav className="sticky top-0 z-50 backdrop-blur-md">
        <div
          className="absolute inset-0 bg-white/40 transition-opacity duration-300"
          style={{ opacity: scrolled ? 0 : 1 }}
        />
        <div
          className="absolute inset-0 bg-white/85 border-b border-border shadow-sm transition-opacity duration-300"
          style={{ opacity: scrolled ? 1 : 0 }}
        />
        <div className="container relative flex items-center justify-between py-4">
          <a href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Dog className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold uppercase text-foreground">Doggle</span>
          </a>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
               <>
                 <span className="text-sm text-muted-foreground hidden sm:inline">Bienvenue, {user?.name}</span>
                 <Button variant="outline" size="sm" asChild>
                   <a href="/discovery">Espace Découverte</a>
                 </Button>
               </>
            ) : (
              <Button size="sm" className="active:scale-95 transition-transform" asChild>
                <a href={getLoginUrl()}>Se connecter</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — asymmetric split: message left, real photo right */}
      <MemphisBackground className="pt-16 pb-20 md:pt-20 md:pb-28" intensity="low">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduceMotion ? 0.3 : 0.7, ease: EASE_OUT }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold uppercase text-foreground mb-6 leading-[1.05] memphis-line-accent">
                Rencontres canines
                <br />
                <span className="text-accent">authentiques</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 font-medium max-w-lg">
                Connectez-vous avec d'autres maîtres près de chez vous pour des amitiés durables et du mentorat entre passionnés.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-12">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase active:scale-95 transition-transform"
                  asChild
                >
                  <a href={getLoginUrl()}>Rejoindre Doggle</a>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-md">
                {[
                  { value: "500+", label: "Chiens inscrits" },
                  { value: "1200+", label: "Maîtres actifs" },
                  { value: "300+", label: "Matchs réussis" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reduceMotion ? 0.3 : 0.5, delay: 0.3 + i * 0.08, ease: EASE_OUT }}
                  >
                    <p className="text-2xl md:text-3xl font-black text-accent">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="relative"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: reduceMotion ? 0.3 : 0.8, delay: 0.15, ease: EASE_OUT }}
            >
              <div className="absolute -top-6 -left-6 w-24 h-24 memphis-circle bg-mint/50 -z-10" />
              <div className="absolute -bottom-8 -right-4 w-20 h-20 memphis-triangle bg-peach/60 -z-10" />
              <motion.div
                className="rounded-2xl overflow-hidden border-4 border-foreground shadow-xl"
                style={{ y: heroPhotoY }}
              >
                <img
                  src={IMG.hero}
                  alt="Chiot golden retriever qui court joyeusement dans l'herbe au coucher du soleil"
                  className="w-full h-[340px] md:h-[420px] object-cover"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  width={1400}
                  height={933}
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </MemphisBackground>

      {/* Features Section — asymmetric, image-backed steps (not 3 identical cards) */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container">
          <Reveal>
            <h2 className="text-4xl md:text-5xl font-bold uppercase text-center mb-16 text-foreground">
              Comment ça marche
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                img: IMG.profile,
                alt: "Chien roux souriant sur un chemin de randonnée",
                icon: Dog,
                cardClass: "border-2 border-peach/30 bg-gradient-to-br from-peach/10 to-peach/5",
                badgeClass: "memphis-circle bg-peach/70",
                title: "Créez un profil",
                text: "Présentez votre chien avec photos, personnalité et vos intérêts en tant que maître.",
                offset: "md:mt-0",
              },
              {
                img: IMG.swipe,
                alt: "Deux chiens qui courent côte à côte au lever du soleil",
                icon: Heart,
                cardClass: "border-2 border-mint/30 bg-gradient-to-br from-mint/10 to-mint/5",
                badgeClass: "memphis-triangle bg-mint/70",
                title: "Swipez et matchez",
                text: "Découvrez des duos chien+maître à proximité et swipez pour créer des connexions.",
                offset: "md:mt-10",
              },
              {
                img: IMG.connect,
                alt: "Chien joyeux sur une plage face à la mer",
                icon: Users,
                cardClass: "border-2 border-lilac/30 bg-gradient-to-br from-lilac/10 to-lilac/5",
                badgeClass: "memphis-diamond bg-lilac/70",
                title: "Connectez-vous",
                text: "Messagez vos matches et organisez des rencontres canines enrichissantes.",
                offset: "md:mt-20",
              },
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.08} className={feature.offset}>
                <div className={`relative rounded-lg overflow-hidden ${feature.cardClass}`}>
                  <div className="relative h-40">
                    <img
                      src={feature.img}
                      alt={feature.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                      width={800}
                      height={533}
                    />
                    <div
                      className={`absolute -bottom-6 left-6 w-14 h-14 flex items-center justify-center shadow-md ${feature.badgeClass}`}
                    >
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="p-8 pt-10">
                    <h3 className="text-2xl font-bold uppercase mb-4 text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section — image + text, asymmetric split */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 memphis-square bg-peach/20 opacity-40 z-0" />
        <div className="absolute bottom-0 left-0 w-32 h-32 memphis-circle bg-mint/20 opacity-40 z-0" />

        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <div className="rounded-2xl overflow-hidden border-4 border-foreground shadow-lg">
                <img
                  src={IMG.mission}
                  alt="Chiot bouledogue français allongé sur fond jaune"
                  className="w-full h-[320px] md:h-[400px] object-cover"
                  loading="lazy"
                  decoding="async"
                  width={1000}
                  height={1000}
                />
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h2 className="text-4xl md:text-5xl font-bold uppercase mb-8 text-foreground">Notre mission</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Sparkles className="w-7 h-7 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold uppercase mb-1 text-foreground">Au-delà du matching canin</h3>
                    <p className="text-muted-foreground">
                      Doggle est une plateforme communautaire qui valorise les connexions humaines authentiques.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Sparkles className="w-7 h-7 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold uppercase mb-1 text-foreground">Échanges intergénérationnels</h3>
                    <p className="text-muted-foreground">
                      Nous encourageons les rencontres entre générations : partage d'expériences, mentorat, amitié durable.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Sparkles className="w-7 h-7 text-accent flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-bold uppercase mb-1 text-foreground">Communauté saine</h3>
                    <p className="text-muted-foreground">
                      Une communauté bienveillante où les maîtres se soutiennent et créent des liens durables.
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Lost Dogs Alert — real photo backdrop instead of flat gradient */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <img
          src={IMG.lostDogs}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/90 via-red-500/85 to-pink-500/80" />
        <div className="container relative z-10 text-center text-white">
          <Reveal>
            <div className="flex items-center justify-center gap-3 mb-4">
              <AlertTriangle size={32} />
              <span className="text-lg font-bold uppercase">Aide-nous à retrouver</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-6">Chiens perdus</h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto font-semibold">
              Chaque minute compte. Si vous voyez un chien perdu, signalez-le immédiatement. Votre aide peut sauver une vie.
            </p>
            <Button
              size="lg"
              className="bg-white text-red-600 hover:bg-gray-100 font-bold uppercase border-2 border-black shadow-lg active:scale-95 transition-transform"
              asChild
            >
              <a href="/lost-dogs">Voir les chiens perdus</a>
            </Button>
          </Reveal>
        </div>
      </section>

      {/* Final CTA — asymmetric split with a closing photo */}
      <section className="py-20 md:py-28 bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <h2 className="text-4xl md:text-5xl font-bold uppercase mb-6 text-foreground">
                Prêt à trouver votre prochain ami ?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-md">
                Rejoignez la communauté Doggle et découvrez des connexions authentiques pour vous et votre chien.
              </p>
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase active:scale-95 transition-transform"
                asChild
              >
                <a href={getLoginUrl()}>Rejoindre Doggle</a>
              </Button>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-2xl overflow-hidden border-4 border-foreground shadow-lg">
                <img
                  src={IMG.cta}
                  alt="Chiot berger australien aux yeux bleus allongé sur un chemin"
                  className="w-full h-[300px] md:h-[360px] object-cover"
                  loading="lazy"
                  decoding="async"
                  width={1000}
                  height={667}
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Dog className="w-6 h-6" />
                <span className="font-bold uppercase">Doggle</span>
              </div>
              <p className="text-sm text-gray-300">Connecter les maîtres, enrichir les vies.</p>
            </div>
            <div>
              <h4 className="font-bold uppercase mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="/features" className="hover:text-accent transition-colors">Fonctionnalités</a></li>
                <li><a href="/pricing" className="hover:text-accent transition-colors">Tarification</a></li>
                <li><a href="/security" className="hover:text-accent transition-colors">Sécurité</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="/about" className="hover:text-accent transition-colors">À propos</a></li>
                <li><a href="/blog" className="hover:text-accent transition-colors">Blog</a></li>
                <li><a href="/contact" className="hover:text-accent transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="/privacy" className="hover:text-accent transition-colors">Confidentialité</a></li>
                <li><a href="/terms" className="hover:text-accent transition-colors">Conditions</a></li>
                <li><a href="/cookies" className="hover:text-accent transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-300">
            <p>&copy; 2026 Doggle. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
