import { FileText, ShieldAlert, Award, HelpingHand } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function TermsPage() {
  const sections = [
    {
      icon: HelpingHand,
      title: "1. Comportement et Bienveillance",
      desc: "Tous les utilisateurs s'engagent à respecter une charte de bienveillance. Woofyz est un espace amical d'entraide. Les propos inappropriés, le spam, les comportements agressifs ou discriminatoires envers des maîtres ou des chiens conduiront à la suspension immédiate du compte.",
    },
    {
      icon: ShieldAlert,
      title: "2. Responsabilité Civile des Maîtres",
      desc: "Vous restez légalement responsable du comportement de vos animaux de compagnie lors des balades réelles organisées via Woofyz. Les chiens doivent être vaccinés, identifiés et tenus en laisse/muselés si la législation locale ou leur tempérament l'impose.",
    },
    {
      icon: Award,
      title: "3. Limitation de Responsabilité",
      desc: "Woofyz agit uniquement en tant que plateforme de mise en relation de voisinage. Nous n'assumons aucune responsabilité quant au déroulement physique des promenades, des gardes informelles ou de tout autre événement physique ou incident direct ou indirect.",
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
              <FileText className="w-5 h-5 text-accent animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Conditions Générales</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Conditions de <span className="text-accent">Service</span>
            </h1>
            <p className="text-sm font-semibold text-muted-foreground max-w-xl mx-auto">
              Dernière mise à jour : 10 Juillet 2026. L'utilisation de Woofyz implique l'acceptation pleine et entière des conditions d'utilisation suivantes.
            </p>
          </motion.div>

          <Card className="p-8 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-12 space-y-6">
            <p className="text-sm font-medium leading-relaxed text-muted-foreground">
              Bienvenue sur Woofyz ! Nos CGU définissent les règles d'utilisation de nos services en ligne de matching et d'alertes communautaires. En accédant à Woofyz, vous acceptez de respecter ces règles.
            </p>

            <div className="border-t-2 border-black pt-6 space-y-8">
              {sections.map((sec) => (
                <div key={sec.title} className="flex gap-4 items-start">
                  <div className="p-2 border-2 border-black rounded-lg bg-accent/10 text-accent flex-shrink-0 mt-1">
                    <sec.icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold uppercase text-foreground">{sec.title}</h3>
                    <p className="text-sm font-medium leading-relaxed text-muted-foreground">{sec.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="text-center text-xs text-muted-foreground font-semibold">
            Pour signaler un manquement à nos CGU, contactez <a href="mailto:support@woofyz.com" className="text-accent underline">support@woofyz.com</a>.
          </div>
        </div>
      </MemphisBackground>
    </div>
  );
}
