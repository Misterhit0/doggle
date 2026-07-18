import { Dog, Heart, Award, Users } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function AboutPage() {
  const values = [
    {
      icon: Dog,
      title: "Bien-être canin",
      desc: "La socialisation est cruciale pour l'équilibre mental et physique de nos compagnons à quatre pattes.",
      color: "bg-peach/10 border-peach/30 text-peach",
    },
    {
      icon: Heart,
      title: "Bienveillance",
      desc: "Nous construisons une communauté solidaire, accueillante et respectueuse de tous les maîtres et de toutes les races.",
      color: "bg-mint/10 border-mint/30 text-mint",
    },
    {
      icon: Users,
      title: "Partage local",
      desc: "Favoriser l'entraide de voisinage : conseils, garde partagée informelle, événements de quartier.",
      color: "bg-lilac/10 border-lilac/30 text-lilac",
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
              <Award className="w-5 h-5 text-accent animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Notre mission</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-foreground leading-[1.1] mb-6">
              À propos de <span className="text-accent">Woofyz</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Découvrez l'histoire de la plateforme créée par des passionnés, pour des passionnés de chiens.
            </p>
          </motion.div>

          <div className="space-y-12">
            {/* Story Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
            >
              <Card className="p-8 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <h2 className="text-3xl font-black uppercase text-foreground">Notre Histoire 🐾</h2>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                  Woofyz est né d'un constat simple de notre fondateur, fatigué de voir son jeune golden retriever s'ennuyer lors des balades quotidiennes. Alors que la plupart des applications connectent les humains pour des rencontres amoureuses, aucune ne s'intéressait à la socialisation de nos compagnons canins et au partage d'expérience entre maîtres.
                </p>
                <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                  En 2026, nous avons lancé Woofyz, une plateforme indépendante qui aide les propriétaires de chiens à se rencontrer localement. Que ce soit pour une simple promenade à deux, des conseils d'éducation, des balades en meute le week-end ou de l'entraide de garde, Woofyz est là pour connecter les maîtres et enrichir les vies de nos animaux.
                </p>
              </Card>
            </motion.div>

            {/* Values Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {values.map((val, i) => (
                <motion.div
                  key={val.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1, ease: EASE_OUT }}
                >
                  <Card className={`h-full p-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col items-start gap-4 ${val.color.split(" ")[0]} ${val.color.split(" ")[1]}`}>
                    <div className={`p-3 rounded-lg border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${val.color.split(" ")[2]}`}>
                      <val.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold uppercase text-foreground">{val.title}</h3>
                    <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                      {val.desc}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </MemphisBackground>
    </div>
  );
}
