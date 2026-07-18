import { Globe, Shield, Cookie, HelpCircle } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function CookiesPage() {
  const list = [
    {
      name: "Cookie de Session / Authentification (session)",
      type: "Strictement Nécessaire",
      desc: "Permet de vous maintenir connecté à votre compte utilisateur au fil de vos visites. Durée de vie : 1 an. Ce cookie est sécurisé (HttpOnly, secure, SameSite=Lax).",
    },
    {
      name: "Préférence de Thème (theme)",
      type: "Fonctionnel",
      desc: "Stocke votre choix de mode d'affichage (thème clair ou sombre) pour optimiser votre confort de lecture lors de vos visites suivantes.",
    },
    {
      name: "Analytiques (Optionnel)",
      type: "Statistiques anonymes",
      desc: "Nous permet de mesurer de manière totalement anonyme l'audience du site (pages vues, temps passé) afin d'améliorer la navigation.",
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
              <Cookie className="w-5 h-5 text-accent animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Gestion des traceurs</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Politique des <span className="text-accent">Cookies</span>
            </h1>
            <p className="text-sm font-semibold text-muted-foreground max-w-xl mx-auto">
              Dernière mise à jour : 10 Juillet 2026. Comment et pourquoi nous utilisons des cookies pour optimiser votre expérience.
            </p>
          </motion.div>

          <Card className="p-8 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-12 space-y-6">
            <div className="flex gap-3 items-center text-foreground font-black text-xl border-b-2 border-black pb-3">
              <HelpCircle className="w-6 h-6 text-accent" />
              Qu'est-ce qu'un Cookie ?
            </div>
            <p className="text-sm font-medium leading-relaxed text-muted-foreground">
              Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette ou mobile) lors de la visite d'un site internet. Il permet de retenir vos choix et vos informations d'authentification pour rendre l'utilisation de Woofyz plus fluide.
            </p>

            <div className="border-t-2 border-black pt-6 space-y-6">
              <h3 className="text-lg font-bold uppercase text-foreground">Traceurs utilisés sur Woofyz</h3>
              <div className="space-y-4">
                {list.map((item) => (
                  <div key={item.name} className="p-4 border-2 border-black rounded-lg bg-gray-50 space-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-start gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground">{item.name}</h4>
                      <span className="px-2 py-0.5 border border-black rounded text-[10px] font-black uppercase bg-accent text-accent-foreground">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="text-center text-xs text-muted-foreground font-semibold">
            Vous pouvez à tout moment configurer votre navigateur pour bloquer l'ensemble des cookies, mais cela désactivera l'authentification et votre capacité à utiliser la plateforme.
          </div>
        </div>
      </MemphisBackground>
    </div>
  );
}
