import { Check, Star, Heart, Dog } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function PricingPage() {
  const plans = [
    {
      name: "Doggle Gratuit",
      price: "0€",
      period: "à vie",
      desc: "Idéal pour débuter et rencontrer des chiens et maîtres près de chez vous.",
      features: [
        "10 swipes par jour maximum",
        "1 favori par jour",
        "Messagerie en temps réel",
        "Accès à la carte des balades",
        "Zone de protection confidentielle",
        "Signalement des chiens perdus",
      ],
      cta: "Commencer",
      href: "/signup",
      popular: false,
      color: "bg-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    },
    {
      name: "Doggle Premium",
      price: "4.99€",
      period: "par mois",
      desc: "Boostez l'efficacité de vos rencontres et gérez plusieurs chiens.",
      features: [
        "20 swipes par jour",
        "2 favoris par jour",
        "Profils de chiens illimités",
        "Badge Premium exclusif sur le profil",
        "Filtres avancés par taille et race",
        "Historique complet des swipes",
      ],
      cta: "Devenir Premium",
      href: "/signup",
      popular: true,
      color: "bg-cyan-50 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ring-2 ring-cyan-300/30",
    },
    {
      name: "Doggle VIP",
      price: "9.99€",
      period: "par mois",
      desc: "Swipes illimités et visibilité maximale pour les passionnés.",
      features: [
        "Swipes illimités (Aucun blocage)",
        "5 favoris par jour",
        "Badge VIP doré exclusif",
        "Priorité dans le feed Discovery",
        "Accès anticipé exclusif aux WoofParties",
        "Soutien direct de l'application",
      ],
      cta: "Devenir VIP",
      href: "/signup",
      popular: false,
      color: "bg-purple-50 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ring-2 ring-purple-300/30",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MemphisBackground className="py-16 md:py-24" intensity="low">
        <div className="container max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Soutenez la communauté</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Nos formules & <span className="text-accent">Tarifs</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Chez Doggle, les fonctionnalités essentielles restent gratuites. Nous proposons un abonnement de soutien pour les maîtres passionnés.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: EASE_OUT }}
                className="flex"
              >
                <Card className={`relative flex flex-col justify-between p-8 border-3 rounded-2xl w-full ${plan.color}`}>
                  {plan.popular && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 border-2 border-black rounded-full bg-accent text-accent-foreground font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      ⭐ Recommandé
                    </span>
                  )}

                  <div>
                    <h3 className="text-2xl font-black uppercase text-foreground mb-2 flex items-center gap-2">
                      {plan.popular ? <Heart className="w-6 h-6 text-accent fill-accent" /> : <Dog className="w-6 h-6 text-foreground" />}
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-semibold mb-6">{plan.desc}</p>

                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-4xl md:text-5xl font-black tracking-tight text-foreground">{plan.price}</span>
                      <span className="text-sm font-bold text-muted-foreground">/ {plan.period}</span>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-3 text-sm font-medium">
                          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span className="text-foreground">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    size="lg"
                    asChild
                    className={`w-full border-2 border-black font-bold uppercase active:scale-95 transition-transform ${plan.popular ? 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white text-black hover:bg-gray-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}
                  >
                    <a href={plan.href}>{plan.cta}</a>
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center text-xs text-muted-foreground font-semibold max-w-md mx-auto"
          >
            Les abonnements peuvent être résiliés à tout moment depuis vos paramètres de profil sans aucun frais supplémentaire. TVA incluse.
          </motion.div>
        </div>
      </MemphisBackground>
    </div>
  );
}
