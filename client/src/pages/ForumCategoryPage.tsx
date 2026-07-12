import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plus, MessageSquare, TrendingUp, Clock, HelpCircle, CheckCircle2, ChevronLeft, ChevronRight, Tag
} from "lucide-react";

type SortType = "recent" | "popular" | "unanswered" | "trending";

const SORT_OPTIONS: { value: SortType; label: string; icon: React.ReactNode }[] = [
  { value: "recent",     label: "Récents",       icon: <Clock size={14} /> },
  { value: "popular",    label: "Populaires",    icon: <TrendingUp size={14} /> },
  { value: "unanswered", label: "Sans réponse",  icon: <HelpCircle size={14} /> },
  { value: "trending",   label: "Tendance",      icon: <TrendingUp size={14} className="text-orange-500" /> },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "solved") return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded font-black">
      <CheckCircle2 size={10} /> Résolu
    </span>
  );
  if (status === "closed") return (
    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-black">Fermé</span>
  );
  return null;
}

export default function ForumCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [sort, setSort] = useState<SortType>("recent");
  const [page, setPage] = useState(1);
  const [activeTag, setActiveTag] = useState<string | undefined>();

  const { data: categories = [] } = trpc.forum.getCategories.useQuery();
  const category = (categories as any[]).find((c: any) => c.slug === slug);

  const { data, isLoading } = trpc.forum.getPosts.useQuery(
    { categorySlug: slug, sort, page, limit: 20, tag: activeTag },
    { keepPreviousData: true } as any
  );

  const posts: any[] = data?.posts ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  // Extraire tous les tags uniques des posts affichés
  const allTags = Array.from(
    new Set(posts.flatMap((p: any) => Array.isArray(p.tags) ? p.tags : []))
  ).slice(0, 12);

  const daysAgo = (date: string) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return d === 0 ? "aujourd'hui" : `il y a ${d}j`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header catégorie */}
      <div
        className="text-white px-4 pt-8 pb-6"
        style={{ background: `linear-gradient(135deg, ${category?.color ?? "#6366f1"}, ${category?.color ?? "#6366f1"}cc)` }}
      >
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/forum")}
            className="flex items-center gap-1 text-white/70 hover:text-white text-sm font-semibold mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Forum
          </button>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{category?.icon ?? "💬"}</span>
            <div>
              <h1 className="text-2xl font-black">{category?.title ?? slug}</h1>
              <p className="text-white/70 text-sm mt-0.5">{category?.description}</p>
              <span className="text-white/60 text-xs font-semibold mt-1 inline-block">
                {total} post{total !== 1 ? "s" : ""}
              </span>
            </div>
            <Button
              onClick={() => navigate("/forum/new")}
              className="ml-auto bg-white/20 hover:bg-white/30 text-white font-bold border border-white/30 backdrop-blur-sm gap-1"
            >
              <Plus size={16} /> Nouveau
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        {/* Filtres de tri */}
        <div className="flex gap-2 flex-wrap mb-4">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setSort(opt.value); setPage(1); }}
              className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg border-2 border-black transition-all
                ${sort === opt.value
                  ? "bg-black text-white shadow-none"
                  : "bg-white text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {/* Filtre par tags */}
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-5">
            <Tag size={14} className="text-muted-foreground self-center" />
            <button
              onClick={() => setActiveTag(undefined)}
              className={`text-xs font-bold px-2 py-1 rounded-full border transition-all
                ${!activeTag ? "bg-black text-white border-black" : "border-slate-300 text-slate-600 hover:border-black"}`}
            >
              Tous
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? undefined : tag)}
                className={`text-xs font-bold px-2 py-1 rounded-full border transition-all
                  ${activeTag === tag ? "bg-black text-white border-black" : "border-slate-300 text-slate-600 hover:border-black"}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Liste des posts */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-xl font-black text-foreground mb-1">Aucun post dans cette catégorie</p>
            <p className="text-muted-foreground text-sm mb-4">Soyez le premier à lancer la discussion !</p>
            <Button onClick={() => navigate("/forum/new")} className="font-bold gap-2">
              <Plus size={16} /> Créer le premier post
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post: any) => {
              const score = (post.upvotes ?? 0) - (post.downvotes ?? 0);
              return (
                <button
                  key={post.id}
                  onClick={() => navigate(`/forum/post/${post.id}`)}
                  className="group w-full text-left flex gap-4 p-4 rounded-xl border-2 border-black bg-white
                             shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                             hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]
                             transition-all duration-150"
                >
                  {/* Score */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-10 pt-1">
                    <span className={`text-base font-black ${score > 0 ? "text-green-600" : score < 0 ? "text-red-500" : "text-slate-400"}`}>
                      {score > 0 ? "+" : ""}{score}
                    </span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">vote</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      {post.isPinned && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1 py-0.5 rounded font-black">📌 Épinglé</span>}
                      <StatusBadge status={post.status} />
                      {post.isLocked && <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1 py-0.5 rounded font-black">🔒</span>}
                    </div>
                    <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[11px] text-muted-foreground">
                      <span>par <b className="text-foreground">{post.authorName}</b></span>
                      <span>{daysAgo(post.createdAt)}</span>
                      <span className="ml-auto flex items-center gap-1">
                        <MessageSquare size={11} /> {post.replyCount ?? 0}
                      </span>
                    </div>
                    {Array.isArray(post.tags) && post.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {post.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-black">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="border-2 border-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
