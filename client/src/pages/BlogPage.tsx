import { BookOpen, Calendar, User, ArrowRight } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function BlogPage() {
  const posts = [
    {
      title: "Comment bien socialiser son chiot lors des premières rencontres ?",
      desc: "La socialisation est une étape clé du développement de votre chiot. Découvrez nos conseils pratiques pour que ses premiers contacts avec d'autres chiens soient constructifs et positifs.",
      image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=600&auto=format&fit=crop",
      date: "12 Juin 2026",
      author: "Marie (Comportementaliste)",
      category: "Éducation",
    },
    {
      title: "Comprendre le langage corporel de votre chien en balade",
      desc: "Apprenez à décoder les signaux d'apaisement, de peur ou d'invitation au jeu de votre chien afin de mieux gérer les interactions physiques et d'éviter les tensions en promenade.",
      image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=600&auto=format&fit=crop",
      date: "04 Juin 2026",
      author: "Julien (Éducateur)",
      category: "Comportement",
    },
    {
      title: "Notre top 5 des meilleurs parcs canins d'Île-de-France",
      desc: "À la recherche d'espaces clos de qualité pour détacher votre chien en toute sécurité ? Voici notre sélection des meilleurs spots de liberté et de jeux pour votre compagnon.",
      image: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?q=80&w=600&auto=format&fit=crop",
      date: "28 Mai 2026",
      author: "L'équipe Doggle",
      category: "Activités",
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
              <BookOpen className="w-5 h-5 text-accent" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Doggle le Mag'</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Notre <span className="text-accent">Blog</span> Canin
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Retrouvez nos derniers articles, conseils d'éducateurs et histoires inspirantes de notre communauté de maîtres.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, i) => (
              <motion.div
                key={post.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE_OUT }}
                className="flex"
              >
                <Card className="flex flex-col justify-between overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all w-full">
                  <div>
                    <div className="relative h-48 border-b-2 border-black">
                      <img
                        src={post.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute top-4 left-4 px-3 py-1 border-2 border-black rounded-md bg-accent text-accent-foreground font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        {post.category}
                      </span>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {post.author}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold uppercase text-foreground leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                        {post.desc}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <button className="inline-flex items-center gap-1 text-xs font-black text-accent uppercase tracking-wider hover:underline hover:underline-offset-2">
                      Lire la suite <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </MemphisBackground>
    </div>
  );
}
