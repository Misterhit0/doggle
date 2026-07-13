import { Shield, EyeOff, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function SecurityPage() {
  const sections = [
    {
      icon: EyeOff,
      title: "Zone de Protection Confidentielle",
      desc: "Nous ne partageons jamais votre adresse exacte. Woofyz applique un brouillage automatique dans un rayon de 200 mètres autour de votre domicile défini. Seule une zone approximative et anonyme apparaît aux autres maîtres en balade sur la carte.",
      color: "bg-blue-50 border-blue-200 text-blue-600",
    },
    {
      icon: UserCheck,
      title: "Vérification des Comptes",
      desc: "Pour éviter les faux profils et garantir la sécurité physique lors des rencontres réelles, nous proposons un système de badge vérifié. Les utilisateurs soumettent un selfie comparé manuellement par nos modérateurs avec leur photo de profil.",
      color: "bg-emerald-50 border-emerald-200 text-emerald-600",
    },
    {
      icon: ShieldCheck,
      title: "Conformité Strict RGPD",
      desc: "Vos données de localisation ne sont partagées en temps réel que si vous l'activez explicitement (Opt-in). Dès que vous arrêtez votre balade ou fermez l'application, le partage cesse immédiatement et vos coordonnées historiques ne sont pas conservées.",
      color: "bg-purple-50 border-purple-200 text-purple-600",
    },
    {
      icon: AlertTriangle,
      title: "Modération et Signalements",
      desc: "Notre communauté repose sur la bienveillance. Si vous observez un comportement inapproprié (messages suspects, agressivité canine non signalée, etc.), vous pouvez signaler l'utilisateur immédiatement. Nos modérateurs traitent les rapports sous 24h.",
      color: "bg-amber-50 border-amber-200 text-amber-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <MemphisBackground className="py-16 md:py-24" intensity="low">
        <div className="container max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Shield className="w-5 h-5 text-accent animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Sécurité et confiance</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Votre <span className="text-accent">Sécurité</span> est notre Priorité
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Parce que connecter des personnes dans le monde réel nécessite une confiance absolue, Woofyz intègre des dispositifs de sécurité avancés et uniques.
            </p>
          </motion.div>

          <div className="space-y-6">
            {sections.map((sec, i) => (
              <motion.div
                key={sec.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: EASE_OUT }}
              >
                <Card className={`p-6 md:p-8 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row gap-6 items-start bg-white`}>
                  <div className={`p-4 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0 ${sec.color.split(" ")[2]}`}>
                    <sec.icon className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold uppercase text-foreground">{sec.title}</h3>
                    <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                      {sec.desc}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-16 p-6 border-2 border-black rounded-xl bg-blue-50 text-center text-xs font-bold uppercase text-blue-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
          >
            🔒 Toutes les connexions à notre API tRPC sont cryptées en HTTPS. Nos bases de données sont sécurisées et hébergées en France.
          </motion.div>
        </div>
      </MemphisBackground>
    </div>
  );
}
