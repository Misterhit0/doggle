import { useState } from "react";
import { Mail, MapPin, Globe, Send, MessageSquare } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);

    // Simulate sending message
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Votre message a bien été envoyé ! Notre équipe vous répondra sous 24h.");
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

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
              <MessageSquare className="w-5 h-5 text-accent animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-foreground">Restons en contact</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase text-foreground leading-[1.1] mb-6">
              Contactez <span className="text-accent">l'Équipe</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Une suggestion, un partenariat ou besoin d'assistance ? Notre équipe de passionnés est à votre écoute.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Info Column */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
              className="md:col-span-2 space-y-6"
            >
              <Card className="p-6 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
                <h3 className="text-2xl font-black uppercase text-foreground border-b-2 border-black pb-3">Nos coordonnées</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 border-2 border-black rounded-lg bg-peach/10 text-peach">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-foreground">E-mail</p>
                      <a href="mailto:hello@woofyz.com" className="text-sm font-semibold text-muted-foreground hover:text-accent transition-colors">
                        hello@woofyz.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2 border-2 border-black rounded-lg bg-mint/10 text-mint">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-foreground">Siège Social</p>
                      <p className="text-sm font-semibold text-muted-foreground">
                        Paris, France
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-2 border-2 border-black rounded-lg bg-lilac/10 text-lilac">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-foreground">Site Internet</p>
                      <a href="https://woofyz.com" className="text-sm font-semibold text-muted-foreground hover:text-accent transition-colors">
                        www.woofyz.com
                      </a>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-2 border-black bg-blue-50/70 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs font-bold leading-relaxed text-blue-950">
                  🐾 Vous rencontrez un problème technique ou un problème de comportement d'un utilisateur ? N'hésitez pas à nous envoyer un message précis avec le nom de l'utilisateur concerné.
                </p>
              </Card>
            </motion.div>

            {/* Form Column */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
              className="md:col-span-3"
            >
              <Card className="p-6 md:p-8 border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="text-xs font-black uppercase text-foreground">
                        Votre Nom <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-black rounded-lg text-sm font-medium focus:ring-2 focus:ring-accent"
                        placeholder="Ex: John Doe"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-xs font-black uppercase text-foreground">
                        Votre Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border-2 border-black rounded-lg text-sm font-medium focus:ring-2 focus:ring-accent"
                        placeholder="Ex: john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="subject" className="text-xs font-black uppercase text-foreground">
                      Sujet
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-black rounded-lg text-sm font-medium focus:ring-2 focus:ring-accent"
                      placeholder="De quoi s'agit-il ?"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="message" className="text-xs font-black uppercase text-foreground">
                      Votre Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3 py-2 border-2 border-black rounded-lg text-sm font-medium focus:ring-2 focus:ring-accent"
                      placeholder="Écrivez votre message ici..."
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full gap-2 border-2 border-black bg-accent text-accent-foreground font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? "Envoi en cours..." : "Envoyer le message"}
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>
        </div>
      </MemphisBackground>
    </div>
  );
}
