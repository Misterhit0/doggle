import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, X, PenLine } from "lucide-react";
import { toast } from "sonner";

export default function ForumNewPostPage() {
  const [, navigate] = useLocation();
  

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const { data: categories = [], isLoading: catsLoading } = trpc.forum.getCategories.useQuery();

  const createMutation = trpc.forum.createPost.useMutation({
    onSuccess: (data) => {
      toast("✅ Post publié !");
      navigate(`/forum/post/${data.id}`);
    },
    onError: (e: any) => {
      toast("Erreur", { description: e.message ?? "Impossible de créer le post. Connectez-vous d'abord." });
    },
  });

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) { toast("Choisissez une catégorie"); return; }
    if (title.trim().length < 5) { toast("Titre trop court (min. 5 caractères)"); return; }
    if (body.trim().length < 10) { toast("Contenu trop court (min. 10 caractères)"); return; }
    createMutation.mutate({ categoryId, title: title.trim(), body: body.trim(), tags });
  };

  const selectedCategory = (categories as any[]).find((c: any) => c.id === categoryId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white pb-20">
      {/* Header */}
      <div className="bg-white border-b-2 border-black px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/forum")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold text-sm"
          >
            <ArrowLeft size={16} /> Forum
          </button>
          <h1 className="font-black text-lg flex items-center gap-2 ml-2">
            <PenLine size={20} className="text-indigo-600" /> Nouveau post
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 mt-6 space-y-5">
        {/* Catégorie */}
        <div>
          <label className="block font-black text-sm mb-2">
            Catégorie <span className="text-red-500">*</span>
          </label>
          {catsLoading ? (
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {(categories as any[]).map((cat: any) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex items-center gap-2 text-left p-3 rounded-xl border-2 text-sm font-bold transition-all
                    ${categoryId === cat.id
                      ? "border-black bg-black text-white shadow-none"
                      : "border-slate-200 bg-white text-foreground hover:border-slate-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                    }`}
                  style={categoryId === cat.id ? {} : {}}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span className="truncate">{cat.title}</span>
                </button>
              ))}
            </div>
          )}
          {selectedCategory && (
            <p className="text-xs text-muted-foreground mt-2 ml-1">
              {selectedCategory.description}
            </p>
          )}
        </div>

        {/* Titre */}
        <div>
          <label className="block font-black text-sm mb-2">
            Titre <span className="text-red-500">*</span>
          </label>
          <Input
            placeholder="Posez votre question ou décrivez votre sujet..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={300}
            className="border-2 border-black font-medium focus:ring-indigo-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          />
          <span className="text-xs text-muted-foreground mt-1 block">{title.length}/300</span>
        </div>

        {/* Corps */}
        <div>
          <label className="block font-black text-sm mb-2">
            Contenu <span className="text-red-500">*</span>
          </label>
          <Textarea
            placeholder={"Écrivez votre message ici...\n\nVous pouvez utiliser Markdown :\n**gras**, *italique*, `code`"}
            value={body}
            onChange={e => setBody(e.target.value)}
            className="min-h-52 border-2 border-black font-mono text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-none"
          />
          <span className="text-xs text-muted-foreground mt-1 block">{body.length}/50000</span>
        </div>

        {/* Tags */}
        <div>
          <label className="block font-black text-sm mb-2">
            Tags <span className="text-muted-foreground font-normal">(optionnel, max 5)</span>
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="labrador, alimentation, santé..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              className="border-2 border-slate-200 text-sm"
              maxLength={30}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={tags.length >= 5}
              className="border-2 border-slate-300 font-bold shrink-0"
            >
              <Plus size={16} />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-1 rounded-full font-bold"
                >
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Aperçu rapide du titre */}
        {title.length > 0 && (
          <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-4">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Aperçu</p>
            <h3 className="font-black text-foreground text-base">{title}</h3>
            {selectedCategory && (
              <span className="text-xs font-bold text-indigo-600 mt-1 inline-block">
                {selectedCategory.icon} {selectedCategory.title}
              </span>
            )}
            {tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {tags.map(t => <span key={t} className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">#{t}</span>)}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/forum")}
            className="border-2 border-slate-300 font-bold"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || !categoryId || title.length < 5 || body.length < 10}
            className="flex-1 bg-black text-white hover:bg-indigo-700 font-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base"
          >
            {createMutation.isPending ? "Publication en cours..." : "🚀 Publier le post"}
          </Button>
        </div>
      </form>
    </div>
  );
}
