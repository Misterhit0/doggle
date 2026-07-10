import { Dog, Heart, Users, MapPin, MessageSquare, AlertTriangle, ShieldCheck } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function FeaturesPage() {
  const features = [
    {
      icon: Heart,
      title: "Matching Intelligent",
      desc: "Notre algorithme de compatibilité croise les traits de personnalité et l'âge de votre chien avec les centres d'intérêt et habitudes de balade des maîtres pour vous proposer des duos parfaits.",
      color: "bg-peach/10 border-peach/30 text-peach",
    },
    {
      icon: MapPin,
      title: "Carte des Balades",
      desc: "Repérez en temps réel les maîtres actifs autour de vous. Notre zone de protection confidentielle automatique protège votre domicile (200m de rayon) en brouillant votre position exacte.",
      color: "bg-mint/10 border-mint/30 text-mint",
    },
    {
      icon: MessageSquare,
      title: "Messagerie Sécurisée",
      desc: "Une fois que vous avez matché, discutez en toute sécurité via notre chat interne. Organisez vos sorties, demandez des conseils ou planifiez vos moments de partage.",
      color: "bg-lilac/10 border-lilac/30 text-lilac",
    },
    {
      icon: AlertTriangle,
      title: "Alerte Chiens Perdus",
      desc: "Un réseau d'urgence communautaire. En cas de perte, signalez votre chien sur la carte locale (25km) et recevez des signalements d'observation en temps réel pour le retrouver vite.",
      color: "bg-red-50 border-red-200 text-red-500",
    },
    {
      icon: Users,
      title: "Événements Canins",
      desc: "Créez ou rejoignez des balades collectives, des pique-niques canins ou des séances d'éducation en groupe près de chez vous pour stimuler la sociabilité de vos compagnons.",
      color: "bg-blue-50 border-blue-200 text-blue-500",
    },
    {
      icon: ShieldCheck,
      title: "Vérification d'Identité",
      desc: "Parce que la sécurité physique et la confiance sont prioritaires, les profils peuvent soumettre un selfie de vérification d'identité validé manuellement par nos équipes.",
      color: "bg-emerald-50 border-emerald-200 text-emerald-600",
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
              <Dog className="w-5 h-5 text-accent" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Découvrez l'expérience</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Fonctionnalités de <span className="text-accent">Doggle</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Conçu pour simplifier les rencontres de vos chiens tout en créant un environnement de soutien social, de sécurité et d'entraide entre propriétaires.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: EASE_OUT }}
              >
                <Card className={`h-full p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col items-start gap-4 ${feature.color.split(" ")[0]} ${feature.color.split(" ")[1]}`}>
                  <div className={`p-3 rounded-lg border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${feature.color.split(" ")[2]}`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold uppercase text-foreground">{feature.title}</h3>
                  <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                    {feature.desc}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE_OUT }}
            className="mt-16 p-8 border-3 border-black rounded-2xl bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-center max-w-3xl mx-auto"
          >
            <h3 className="text-2xl font-bold uppercase text-foreground mb-4">Et bientôt plus encore...</h3>
            <p className="text-muted-foreground font-medium mb-6">
              Nous continuons d'améliorer l'application au quotidien grâce aux retours de notre communauté de passionnés. Aidez-nous à façonner l'avenir de Doggle !
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-black rounded-lg bg-accent text-accent-foreground font-bold uppercase hover:bg-accent/90 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Retour à l'accueil
            </a>
          </motion.div>
        </div>
      </MemphisBackground>
    </div>
  );
}
