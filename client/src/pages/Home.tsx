import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Heart, Dog, Users, Sparkles, AlertTriangle } from "lucide-react";
import MemphisBackground from "@/components/MemphisBackground";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Dog className="w-8 h-8 text-accent" />
            <span className="text-2xl font-bold uppercase text-foreground">Doggle</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">Bienvenue, {user?.name}</span>
                <Button variant="outline" size="sm" asChild>
                  <a href="/dashboard">Tableau de bord</a>
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <a href={getLoginUrl()}>Se connecter</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Memphis Design */}
      <MemphisBackground className="py-20 md:py-32">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold uppercase text-foreground mb-6 memphis-line-accent">
              Rencontres Canines
              <br />
              <span className="text-accent">Authentiques</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 font-medium">
              Connectez-vous avec d'autres maîtres de chiens pour des amitiés durables, du mentorat et des échanges intergénérationnels enrichissants.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 mt-12">
              <div>
                <p className="text-3xl md:text-4xl font-black text-accent">500+</p>
                <p className="text-sm md:text-base text-muted-foreground">Chiens inscrits</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-accent">1200+</p>
                <p className="text-sm md:text-base text-muted-foreground">Maîtres actifs</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-black text-accent">300+</p>
                <p className="text-sm md:text-base text-muted-foreground">Matchs réussis</p>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              className="mt-12 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
              asChild
            >
              <a href={getLoginUrl()}>Commencer maintenant</a>
            </Button>
          </div>
        </div>
      </MemphisBackground>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container">
          <h2 className="text-4xl md:text-5xl font-bold uppercase text-center mb-16 text-foreground">
            Comment ça marche
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="relative p-8 bg-gradient-to-br from-peach/10 to-peach/5 rounded-lg border-2 border-peach/30">
              <div className="absolute -top-6 -left-6 w-16 h-16 memphis-circle bg-peach/60 flex items-center justify-center">
                <Dog className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold uppercase mt-8 mb-4 text-foreground">
                Créez un profil
              </h3>
              <p className="text-muted-foreground">
                Présentez votre chien avec photos, personnalité et vos intérêts en tant que maître.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="relative p-8 bg-gradient-to-br from-mint/10 to-mint/5 rounded-lg border-2 border-mint/30">
              <div className="absolute -top-6 -left-6 w-16 h-16 memphis-triangle bg-mint/60 flex items-center justify-center">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold uppercase mt-8 mb-4 text-foreground">
                Swipez et matchez
              </h3>
              <p className="text-muted-foreground">
                Découvrez des duos chien+maître à proximité et swipez pour créer des connexions.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="relative p-8 bg-gradient-to-br from-lilac/10 to-lilac/5 rounded-lg border-2 border-lilac/30">
              <div className="absolute -top-6 -left-6 w-16 h-16 memphis-diamond bg-lilac/60 flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold uppercase mt-8 mb-4 text-foreground">
                Connectez-vous
              </h3>
              <p className="text-muted-foreground">
                Messagez vos matches et organisez des rencontres canines enrichissantes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Memphis Shapes */}
        <div className="absolute top-0 right-0 w-40 h-40 memphis-square bg-peach/20 opacity-40 z-0" />
        <div className="absolute bottom-0 left-0 w-32 h-32 memphis-circle bg-mint/20 opacity-40 z-0" />

        <div className="container relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold uppercase text-center mb-16 text-foreground">
            Notre mission
          </h2>

          <div className="max-w-2xl mx-auto bg-white rounded-lg p-8 md:p-12 border-4 border-accent">
            <div className="flex items-start gap-4 mb-6">
              <Sparkles className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold uppercase mb-2 text-foreground">
                  Au-delà du matching canin
                </h3>
                <p className="text-muted-foreground">
                  Doggle n'est pas qu'une app de rencontre pour chiens. C'est une plateforme communautaire qui valorise les connexions humaines authentiques.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 mb-6">
              <Sparkles className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold uppercase mb-2 text-foreground">
                  Échanges intergénérationnels
                </h3>
                <p className="text-muted-foreground">
                  Nous encourageons les rencontres entre générations, où chacun apprend de l'autre : partage d'expériences, mentorat, amitié durable.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Sparkles className="w-8 h-8 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold uppercase mb-2 text-foreground">
                  Communauté saine
                </h3>
                <p className="text-muted-foreground">
                  Nous bâtissons une communauté bienveillante où les maîtres se soutiennent, partagent des conseils et créent des liens durables.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lost Dogs Alert Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-red-500 via-red-400 to-pink-400 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <MemphisBackground />
        </div>
        <div className="container relative z-10 text-center text-white">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AlertTriangle size={32} className="animate-pulse" />
            <span className="text-lg font-bold uppercase">Aide-nous à retrouver</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-6">Chiens Perdus</h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto font-semibold">
            Chaque minute compte ! Si vous voyez un chien perdu, signalez-le immédiatement. Votre aide peut sauver une vie.
          </p>
          <Button
            size="lg"
            className="bg-white text-red-600 hover:bg-gray-100 font-bold uppercase border-2 border-black shadow-lg"
            asChild
          >
            <a href="/chiens-perdus">Voir les chiens perdus</a>
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-r from-accent/10 via-accent/5 to-accent/10">
        <div className="container text-center">
          <h2 className="text-4xl md:text-5xl font-bold uppercase mb-8 text-foreground">
            Prêt à trouver votre prochain ami ?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Rejoignez la communauté Doggle et découvrez des connexions authentiques pour vous et votre chien.
          </p>
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
            asChild
          >
            <a href={getLoginUrl()}>Commencer gratuitement</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-white py-12">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Dog className="w-6 h-6" />
                <span className="font-bold uppercase">Doggle</span>
              </div>
              <p className="text-sm text-gray-300">
                Connecter les maîtres, enrichir les vies.
              </p>
            </div>
            <div>
              <h4 className="font-bold uppercase mb-4">Produit</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="text-gray-400">Fonctionnalités (bientôt)</li>
                <li className="text-gray-400">Tarification (bientôt)</li>
                <li className="text-gray-400">Sécurité (bientôt)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase mb-4">Entreprise</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="text-gray-400">À propos (bientôt)</li>
                <li className="text-gray-400">Blog (bientôt)</li>
                <li className="text-gray-400">Contact (bientôt)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold uppercase mb-4">Légal</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="text-gray-400">Confidentialité (bientôt)</li>
                <li className="text-gray-400">Conditions (bientôt)</li>
                <li className="text-gray-400">Cookies (bientôt)</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-300">
            <p>&copy; 2026 Doggle. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
