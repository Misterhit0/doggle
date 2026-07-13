import { useState } from "react";
import { Check, Star, Heart, ShieldCheck, Award } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Standard",
      price: "0€",
      period: "à vie",
      desc: "L'essentiel pour commencer vos rencontres canines locales.",
      features: [
        "Jusqu'à 10 swipes par jour",
        "Maintien de 3 discussions actives",
        "Lecture du forum d'entraide",
        "Accès à la carte des balades",
        "Signalement des chiens perdus",
      ],
      cta: "Commencer gratuitement",
      href: "/signup",
      popular: false,
      color: "bg-yellow-50/90 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
      badge: "B2C • Gratuit",
      icon: ShieldCheck,
    },
    {
      name: "WoofPass Premium",
      price: billingPeriod === "monthly" ? "4.99€" : "39.99€",
      period: billingPeriod === "monthly" ? "par mois" : "par an",
      equivalent: billingPeriod === "yearly" ? "soit 3.33€/mois" : undefined,
      desc: "Mise en relation illimitée et outils avancés pour maîtres passionnés.",
      features: [
        "Mise en relation illimitée",
        "Filtres comportementaux avancés",
        "Création de balades privées",
        "Badge Chien Vérifié (Identité & Santé)",
        "Accès prioritaire aux WoofParties",
        "Historique complet des swipes",
      ],
      cta: "Activer mon WoofPass",
      href: "/signup",
      popular: true,
      color: "bg-cyan-50/95 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ring-2 ring-cyan-300/30",
      badge: "B2C • Recommandé",
      icon: Heart,
    },
    {
      name: "Pack Visibilité Pro",
      price: billingPeriod === "monthly" ? "19.99€" : "179.99€",
      period: billingPeriod === "monthly" ? "par mois" : "par an",
      equivalent: billingPeriod === "yearly" ? "soit 14.99€/mois" : undefined,
      desc: "Développez votre visibilité et devenez la référence pour les maîtres.",
      features: [
        "Référencement pro prioritaire",
        "Outil de prise de RDV en ligne",
        "Messagerie pro dédiée",
        "Articles certifiés sur le forum",
        "Statistiques de visibilité mensuelles",
        "Tous les avantages Premium inclus",
      ],
      cta: "Rejoindre la communauté Pro",
      href: "/signup",
      popular: false,
      color: "bg-purple-50/90 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ring-2 ring-purple-300/30",
      badge: "B2B • Professionnels",
      icon: Award,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MemphisBackground className="py-16 md:py-24" intensity="low">
        <div className="container max-w-5xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 animate-spin-slow" />
              <span className="text-[10px] font-black uppercase tracking-wider text-foreground">Le modèle hybride Woofyz</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Formules & <span className="text-accent underline decoration-4 decoration-black">Tarifs</span>
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto font-bold uppercase tracking-wide">
              Des abonnements adaptés pour les particuliers et professionnels canins.
            </p>
          </motion.div>

          {/* Neo-brutalist Toggle Switch */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex justify-center items-center gap-4 mb-16"
          >
            <span className={`text-xs font-black uppercase tracking-wider transition-colors ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
              Mensuel
            </span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
              className="w-16 h-8 border-3 border-black rounded-full bg-white relative transition-colors duration-200 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
            >
              <motion.div
                layout
                className="w-5 h-5 rounded-full bg-accent border-2 border-black absolute top-0.5"
                animate={{ left: billingPeriod === "monthly" ? "4px" : "34px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-xs font-black uppercase tracking-wider transition-colors ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"} flex items-center gap-2`}>
              Annuel
              <span className="px-2 py-0.5 border border-black rounded bg-emerald-200 text-black text-[9px] font-black uppercase tracking-wider animate-pulse">
                Économisez 30%+
              </span>
            </span>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, i) => {
              const IconComponent = plan.icon;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.12, ease: EASE_OUT }}
                  className="flex"
                >
                  <Card className={`relative flex flex-col justify-between p-8 border-3 rounded-2xl w-full ${plan.color}`}>
                    
                    {/* Badge header */}
                    <span className="absolute -top-4 left-6 px-3 py-1 border-2 border-black rounded bg-white text-foreground font-black text-[9px] uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {plan.badge}
                    </span>

                    <div className="pt-2">
                      <h3 className="text-xl font-black uppercase text-foreground mb-2 flex items-center gap-2">
                        <IconComponent className="w-5 h-5 text-foreground flex-shrink-0" />
                        {plan.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-semibold mb-6 leading-relaxed">{plan.desc}</p>

                      <div className="flex flex-col mb-8">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl md:text-5xl font-black tracking-tight text-foreground">{plan.price}</span>
                          <span className="text-xs font-bold text-muted-foreground uppercase">/ {plan.period}</span>
                        </div>
                        {plan.equivalent && (
                          <span className="text-[10px] font-bold text-emerald-600 uppercase mt-1">
                            ({plan.equivalent})
                          </span>
                        )}
                      </div>

                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-3 text-xs font-bold">
                            <Check className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <span className="text-foreground leading-normal">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      size="lg"
                      asChild
                      className={`w-full border-2 border-black font-black uppercase active:translate-y-0.5 transition-all text-xs cursor-pointer ${
                        plan.popular
                          ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
                          : "bg-white text-black hover:bg-gray-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none"
                      }`}
                    >
                      <a href={plan.href}>{plan.cta}</a>
                    </Button>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-16 text-center text-[10px] text-muted-foreground font-black uppercase tracking-wider max-w-md mx-auto"
          >
            Les abonnements peuvent être résiliés à tout moment depuis vos paramètres de profil sans aucun frais supplémentaire. TVA incluse.
          </motion.div>
        </div>
      </MemphisBackground>
    </div>
  );
}
