import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ReviewPage() {
  const [location, navigate] = useLocation();
  const reviewedId = parseInt(new URLSearchParams(location.split('?')[1]).get('userId') || "0");
  const matchId = new URLSearchParams(location.split('?')[1]).get('matchId');
  const matchIdNum = matchId ? parseInt(matchId) : undefined;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);

  const createReviewMutation = trpc.reviews.createReview.useMutation({
    onSuccess: () => {
      toast.success("Avis publié avec succès !");
      navigate("/discovery", { replace: true });
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la publication de l'avis");
    },
  });

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error("Veuillez donner une note");
      return;
    }

    createReviewMutation.mutate({
      reviewedId,
      matchId: matchIdNum,
      rating,
      comment: comment || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted py-12">
      <div className="container max-w-2xl">
        <Card className="p-8 border-2 border-accent">
          <h1 className="text-4xl font-bold uppercase mb-2 text-foreground">
            Laisser un avis
          </h1>
          <p className="text-muted-foreground mb-8">
            Partagez votre expérience avec ce maître et son chien
          </p>

          {/* Rating Stars */}
          <div className="mb-8">
            <Label className="text-lg font-bold mb-4 block">Note</Label>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={40}
                    className={`${
                      star <= (hoveredRating || rating)
                        ? "fill-accent text-accent"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                {rating === 1 && "Mauvaise expérience"}
                {rating === 2 && "Expérience décevante"}
                {rating === 3 && "Expérience correcte"}
                {rating === 4 && "Bonne expérience"}
                {rating === 5 && "Excellente expérience"}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="mb-8">
            <Label htmlFor="comment" className="text-lg font-bold mb-4 block">
              Commentaire (optionnel)
            </Label>
            <Textarea
              id="comment"
              placeholder="Partagez les détails de votre rencontre..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              className="min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {comment.length}/500 caractères
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={handleSubmit}
              disabled={createReviewMutation.isPending || rating === 0}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-bold uppercase"
            >
              {createReviewMutation.isPending ? "Publication..." : "Publier l'avis"}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/discovery", { replace: true })}
              className="flex-1"
            >
              Annuler
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
