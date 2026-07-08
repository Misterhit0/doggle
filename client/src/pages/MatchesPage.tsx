import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Heart, MessageCircle, Users } from "lucide-react";
import { CompatibilityScore } from "@/components/CompatibilityScore";

export default function MatchesPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch matches
  const { data: matches, isLoading } = trpc.match.getMatches.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold uppercase text-foreground mb-2">Mes Matchs</h1>
          <p className="text-muted-foreground">Vous avez {matches?.length || 0} match{matches && matches.length !== 1 ? 'es' : ''}</p>
        </div>

        {matches && matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map((match: any) => {
              // Determine if current user is user1 or user2
              const isUser1 = match.user1Id === user?.id;
              const otherUserId = isUser1 ? match.user2Id : match.user1Id;
              const otherUserName = isUser1 ? match.user2Name : match.user1Name;

              return (
                <Card key={match.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="mb-4">
                      <h3 className="text-2xl font-bold uppercase text-foreground mb-2">{otherUserName}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Heart size={16} className="text-accent" fill="currentColor" />
                        Match depuis {new Date(match.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {/* Compatibility Score */}
                    <div className="mb-6">
                      <CompatibilityScore score={match.compatibilityScore} compact={true} />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setLocation(`/conversation/${match.id}`)}
                        className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase gap-2"
                      >
                        <MessageCircle size={18} />
                        Discuter
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Users size={18} />
                        Profil
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Heart size={48} className="mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-2xl font-bold uppercase text-foreground mb-2">Aucun match pour le moment</h2>
            <p className="text-muted-foreground mb-6">
              Commencez à découvrir des duos pour trouver vos matchs!
            </p>
            <Button
              onClick={() => setLocation('/discovery')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
            >
              Découvrir maintenant
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
