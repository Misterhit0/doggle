import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Clock, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function VerificationPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getVerificationQuery = trpc.verification.getVerification.useQuery();
  const uploadPhotoMutation = trpc.storage.uploadPhoto.useMutation();
  const submitVerificationMutation = trpc.verification.submitVerification.useMutation({
    onSuccess: () => {
      toast.success("Selfie soumis pour vérification !");
      getVerificationQuery.refetch();
      setSelectedFile(null);
      setPreview(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de la soumission");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      toast.error("Veuillez sélectionner une image JPG ou PNG.");
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !preview) {
      toast.error("Veuillez sélectionner une photo");
      return;
    }

    try {
      toast.loading("Upload de la photo...", { id: "upload-verification" });
      const res = await uploadPhotoMutation.mutateAsync({
        base64Data: preview,
        filename: selectedFile.name,
      });
      submitVerificationMutation.mutate({
        photoUrl: res.url,
      });
      toast.success("Photo uploadée avec succès !", { id: "upload-verification" });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload", { id: "upload-verification" });
    }
  };

  const verification = getVerificationQuery.data;

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-2xl">
        <h1 className="text-4xl font-bold uppercase mb-8 text-foreground">
          Vérification d'identité
        </h1>

        {/* Status Card */}
        {verification && (
          <div className="mb-8">
            {verification.status === "approved" && (
              <div className="flex items-start gap-4 border-3 border-black bg-green-100 p-5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CheckCircle className="text-green-700 flex-shrink-0 mt-1 stroke-[3px]" size={28} />
                <div>
                  <h3 className="font-black text-xl uppercase tracking-wider text-green-950">Vérifié ✓</h3>
                  <p className="text-sm text-green-900 mt-1 font-semibold">
                    Votre identité a été vérifiée avec succès. Vous avez désormais accès à l'ensemble des fonctionnalités de la communauté Doggle.
                  </p>
                </div>
              </div>
            )}

            {verification.status === "pending" && (
              <div className="flex items-start gap-4 border-3 border-black bg-yellow-100 p-5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Clock className="text-yellow-700 flex-shrink-0 mt-1 stroke-[3px]" size={28} />
                <div>
                  <h3 className="font-black text-xl uppercase tracking-wider text-yellow-950">En attente de revue</h3>
                  <p className="text-sm text-yellow-900 mt-1 font-semibold">
                    Votre selfie a été soumis. Notre équipe de modération l'analysera sous 24 heures pour approuver votre profil.
                  </p>
                </div>
              </div>
            )}

            {verification.status === "rejected" && (
              <div className="flex items-start gap-4 border-3 border-black bg-red-100 p-5 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <AlertCircle className="text-red-700 flex-shrink-0 mt-1 stroke-[3px]" size={28} />
                <div>
                  <h3 className="font-black text-xl uppercase tracking-wider text-red-950">Vérification refusée</h3>
                  <p className="text-sm text-red-900 mt-1 font-semibold">
                    {verification.rejectionReason || "Votre photo ne respecte pas nos critères d'identification."}
                  </p>
                  <p className="text-sm text-red-900 mt-2 font-bold uppercase">Veuillez soumettre une nouvelle photo plus nette.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload Card */}
        {!verification || verification.status === "rejected" ? (
          <Card className="p-8 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white">
            <div className="mb-8">
              <h2 className="text-2xl font-black mb-4 uppercase text-foreground">
                Soumettre un selfie
              </h2>
              <p className="text-muted-foreground font-semibold mb-4">
                Pour assurer la sécurité et renforcer la confiance de tous au sein du réseau Compagnon, nous vous invitons à vérifier votre identité.
              </p>
              <div className="bg-muted p-4 border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-xs font-bold uppercase text-foreground mb-2">Critères de validation :</p>
                <ul className="text-xs text-foreground font-medium space-y-1">
                  <li>• Votre visage complet doit être clairement identifiable</li>
                  <li>• Pas de lunettes de soleil, pas de casquettes cachant les yeux</li>
                  <li>• Luminosité naturelle (évitez le contre-jour)</li>
                  <li>• Image récente au format JPG ou PNG</li>
                </ul>
              </div>
            </div>

            {/* Preview */}
            {preview && (
              <div className="mb-8">
                <Label className="text-md font-bold uppercase mb-3 block">Aperçu de la photo</Label>
                <div className="border-3 border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-sm mx-auto bg-muted">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full object-cover max-h-80"
                  />
                </div>
              </div>
            )}

            {/* File Input */}
            <div className="mb-8">
              <Label htmlFor="photo" className="text-md font-bold uppercase mb-3 block">
                Fichier photo
              </Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-3 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                  isDragging 
                    ? "border-accent bg-accent/10 scale-102" 
                    : "border-black hover:bg-accent/5 hover:border-accent"
                }`}
              >
                <input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="photo" className="cursor-pointer">
                  <Upload className="mx-auto mb-4 text-accent" size={32} />
                  <p className="font-bold uppercase text-foreground text-sm">Sélectionnez un fichier</p>
                  <p className="text-xs text-muted-foreground mt-1">Glissez-déposez votre selfie ici</p>
                </label>
              </div>
              {selectedFile && (
                <div className="border-2 border-black px-3 py-2 bg-muted mt-4 rounded text-xs font-semibold inline-block">
                  Fichier chargé : {selectedFile.name}
                </div>
              )}
            </div>

            {/* Actions */}
            <Button
              onClick={handleSubmit}
              disabled={!selectedFile || submitVerificationMutation.isPending}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all uppercase"
            >
              {submitVerificationMutation.isPending ? "Transmission en cours..." : "Soumettre ma vérification"}
            </Button>
          </Card>
        ) : (
          <Card className="p-8 border-3 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-white text-center">
            <CheckCircle className="mx-auto mb-4 text-green-600 stroke-[3px]" size={56} />
            <h2 className="text-2xl font-black mb-4 uppercase text-foreground">
              Profil Vérifié !
            </h2>
            <p className="text-muted-foreground font-semibold">
              Votre identité a été approuvée. Merci d'aider à préserver la sécurité de la communauté Compagnon !
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
