import { Lock, Shield, EyeOff, Trash2 } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function PrivacyPage() {
  const points = [
    {
      icon: EyeOff,
      title: "1. Vos Données de Localisation",
      desc: "Votre position GPS précise est utilisée uniquement lorsque vous activez explicitement le suivi des balades (opt-in). Dès que la balade se termine, les coordonnées historiques ne sont pas conservées. De plus, un rayon de protection de 200m est appliqué d'office autour de votre domicile.",
    },
    {
      icon: Shield,
      title: "2. Utilisation des Données",
      desc: "Nous recueillons votre nom, e-mail, photo de profil, informations de profil canin et préférences de socialisation pour assurer le fonctionnement de la mise en relation. Vos informations ne sont jamais vendues, louées ou partagées avec des tiers publicitaires.",
    },
    {
      icon: Trash2,
      title: "3. Droits de Modification et de Suppression",
      desc: "Conformément au RGPD, vous disposez d'un droit total d'accès, de rectification et d'effacement de vos données personnelles. Vous pouvez supprimer vos chiens ou votre compte complet à tout moment directement depuis les paramètres de votre compte ou sur simple demande.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MemphisBackground className="py-16 md:py-24" intensity="low">
        <div className="container max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Lock className="w-5 h-5 text-accent animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Mentions Légales</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Politique de <span className="text-accent">Confidentialité</span>
            </h1>
            <p className="text-sm font-semibold text-muted-foreground max-w-xl mx-auto">
              Dernière mise à jour : 10 Juillet 2026. Chez Woofyz, nous respectons scrupuleusement la vie privée des maîtres et la protection de leurs données.
            </p>
          </motion.div>

          <Card className="p-8 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-12 space-y-6">
            <p className="text-sm font-medium leading-relaxed text-muted-foreground">
              Woofyz est une application éditée en France. Nous prenons le respect du Règlement Général sur la Protection des Données (RGPD) très au sérieux. Cette page décrit comment nous recueillons, traitons et protégeons vos données.
            </p>

            <div className="border-t-2 border-black pt-6 space-y-8">
              {points.map((point) => (
                <div key={point.title} className="flex gap-4 items-start">
                  <div className="p-2 border-2 border-black rounded-lg bg-accent/10 text-accent flex-shrink-0 mt-1">
                    <point.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold uppercase text-foreground">{point.title}</h3>
                    <p className="text-sm font-medium leading-relaxed text-muted-foreground">{point.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="text-center text-xs text-muted-foreground font-semibold">
            Pour toute question relative à vos données personnelles, veuillez nous contacter à <a href="mailto:privacy@woofyz.com" className="text-accent underline">privacy@woofyz.com</a>.
          </div>
        </div>
      </MemphisBackground>
    </div>
  );
}
