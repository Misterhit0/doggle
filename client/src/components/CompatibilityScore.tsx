import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Heart, Zap, Users, Target } from "lucide-react";

interface CompatibilityScoreProps {
  score: number;
  breakdown?: {
    dogTraits: number;
    ageAlignment: number;
    personalityMatch: number;
    interestAlignment: number;
    seekAlignment: number;
  };
  compact?: boolean;
}

export function CompatibilityScore({ score, breakdown, compact = false }: CompatibilityScoreProps) {
  const getScoreLabel = (s: number): string => {
    if (s >= 85) return "Excellent match 🔥";
    if (s >= 70) return "Bon match 👍";
    if (s >= 50) return "Compatible 💙";
    if (s >= 30) return "Peut-être 🤔";
    return "Peu compatible 😕";
  };

  const getScoreColor = (s: number): string => {
    if (s >= 85) return "from-red-500 to-orange-500";
    if (s >= 70) return "from-green-500 to-emerald-500";
    if (s >= 50) return "from-blue-500 to-cyan-500";
    if (s >= 30) return "from-yellow-500 to-amber-500";
    return "from-gray-500 to-slate-500";
  };

  const scoreColor = getScoreColor(score);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold text-foreground">Compatibilité</span>
            <span className="text-sm font-bold text-accent">{Math.round(score)}%</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
      </div>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-accent/10 to-lilac/10">
      <div className="space-y-6">
        {/* Main score */}
        <div className="text-center">
          <div className={`inline-block bg-gradient-to-r ${scoreColor} rounded-full p-8 mb-4`}>
            <div className="text-white text-center">
              <div className="text-5xl font-bold">{Math.round(score)}</div>
              <div className="text-sm font-semibold">%</div>
            </div>
          </div>
          <h3 className="text-2xl font-bold uppercase text-foreground mb-2">
            {getScoreLabel(score)}
          </h3>
          <p className="text-sm text-muted-foreground">
            Score de compatibilité global
          </p>
        </div>

        {/* Breakdown */}
        {breakdown && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-semibold text-foreground text-sm">Détails</h4>

            {/* Dog Traits */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-accent" />
                <span className="text-sm font-semibold text-foreground flex-1">Traits des chiens</span>
                <span className="text-sm font-bold text-accent">{Math.round(breakdown.dogTraits)}%</span>
              </div>
              <Progress value={breakdown.dogTraits} className="h-1.5" />
            </div>

            {/* Age Alignment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-lilac" />
                <span className="text-sm font-semibold text-foreground flex-1">Alignement d'âge</span>
                <span className="text-sm font-bold text-lilac">{Math.round(breakdown.ageAlignment)}%</span>
              </div>
              <Progress value={breakdown.ageAlignment} className="h-1.5" />
            </div>

            {/* Personality Match */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-orange-500" />
                <span className="text-sm font-semibold text-foreground flex-1">Personnalité</span>
                <span className="text-sm font-bold text-orange-500">{Math.round(breakdown.personalityMatch)}%</span>
              </div>
              <Progress value={breakdown.personalityMatch} className="h-1.5" />
            </div>

            {/* Interest Alignment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-mint" />
                <span className="text-sm font-semibold text-foreground flex-1">Intérêts communs</span>
                <span className="text-sm font-bold text-mint">{Math.round(breakdown.interestAlignment)}%</span>
              </div>
              <Progress value={breakdown.interestAlignment} className="h-1.5" />
            </div>

            {/* Seek Alignment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-yellow-500" />
                <span className="text-sm font-semibold text-foreground flex-1">Objectifs communs</span>
                <span className="text-sm font-bold text-yellow-500">{Math.round(breakdown.seekAlignment)}%</span>
              </div>
              <Progress value={breakdown.seekAlignment} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Basé sur les traits des chiens et les affinités des maîtres
        </p>
      </div>
    </Card>
  );
}
