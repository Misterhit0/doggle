import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageSquare, TrendingUp, Clock, Search, Plus, Flame, BookOpen, Star
} from "lucide-react";

// ─── Composant Carte de Catégorie ────────────────────────────────────────────

function CategoryCard({ cat, onClick }: { cat: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left w-full p-5 rounded-2xl border-2 border-black bg-white
                 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]
                 transition-all duration-150"
      style={{ borderLeftColor: cat.color, borderLeftWidth: 6 }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{cat.icon}</span>
        <div>
          <h3 className="font-black text-base text-foreground group-hover:text-primary transition-colors">
            {cat.title}
          </h3>
          <span className="text-xs text-muted-foreground font-semibold">
            {cat.postCount ?? 0} post{(cat.postCount ?? 0) !== 1 ? "s" : ""}
          </span>
        </div>
        {cat.isOfficial && (
          <span className="ml-auto text-[10px] bg-slate-700 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
            Officiel
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
    </button>
  );
}

// ─── Composant Carte de Post ─────────────────────────────────────────────────

function PostCard({ post, onClick }: { post: any; onClick: () => void }) {
  const score = (post.upvotes ?? 0) - (post.downvotes ?? 0);
  const daysAgo = Math.floor(
    (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex gap-4 p-4 rounded-xl border-2 border-black bg-white
                 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]
                 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]
                 transition-all duration-150"
    >
      {/* Score */}
      <div className="flex-shrink-0 flex flex-col items-center gap-0.5 w-10 pt-1">
        <span className={`text-lg font-black ${score > 0 ? "text-green-600" : score < 0 ? "text-red-500" : "text-muted-foreground"}`}>
          {score > 0 ? "+" : ""}{score}
        </span>
        <span className="text-[10px] text-muted-foreground">score</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          {post.isPinned && (
            <span className="text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded font-black uppercase">📌 Épinglé</span>
          )}
          {post.status === "solved" && (
            <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded font-black">✅ Résolu</span>
          )}
          {post.status === "closed" && (
            <span className="text-[10px] bg-slate-500 text-white px-1.5 py-0.5 rounded font-black">🔒 Fermé</span>
          )}
          {post.isLocked && (
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black">🔒 Verrouillé</span>
          )}
        </div>
        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors mt-1 line-clamp-2">
          {post.title}
        </h4>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {post.categoryIcon && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
              style={{ borderColor: post.categoryColor, color: post.categoryColor, background: post.categoryColor + "18" }}
            >
              {post.categoryIcon} {post.categoryTitle}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            par <span className="font-semibold text-foreground">{post.authorName}</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            {daysAgo === 0 ? "aujourd'hui" : `il y a ${daysAgo}j`}
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground flex items-center gap-1">
            <MessageSquare size={12} />
            {post.replyCount ?? 0}
          </span>
        </div>
        {/* Tags */}
        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Page principale Forum ────────────────────────────────────────────────────

export default function ForumHomePage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);

  const { data: categories = [], isLoading: catsLoading } = trpc.forum.getCategories.useQuery();
  const { data: trending } = trpc.forum.getPosts.useQuery(
    { sort: "trending", limit: 5 }, { staleTime: 60_000 }
  );
  const { data: searchResults } = trpc.forum.search.useQuery(
    { query: searchQuery, limit: 10 },
    { enabled: searchQuery.length >= 2 }
  );

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.length >= 2) setSearchActive(true);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 pt-10 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/30">
              <MessageSquare size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Forum Doggle</h1>
              <p className="text-indigo-200 text-sm font-medium">
                Partagez, apprenez, échangez avec la communauté
              </p>
            </div>
          </div>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} className="mt-4 flex gap-2">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" />
              <Input
                placeholder="Rechercher un sujet, une race, un conseil..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchActive(false); }}
                className="pl-9 bg-white/10 backdrop-blur-sm border-white/30 text-white placeholder:text-indigo-300 focus:bg-white/20"
              />
            </div>
            <Button type="submit" variant="secondary" className="font-bold shrink-0">
              Chercher
            </Button>
            <Button
              type="button"
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-black border-0 shrink-0 gap-1"
              onClick={() => navigate("/forum/new")}
            >
              <Plus size={16} /> Nouveau post
            </Button>
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8">

        {/* Résultats de recherche */}
        {searchActive && searchResults && (
          <div className="mb-8">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <Search size={20} /> Résultats pour "{searchQuery}"
            </h2>
            {searchResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucun résultat trouvé.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {searchResults.map((post: any) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => navigate(`/forum/post/${post.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trending */}
        {!searchActive && trending?.posts && trending.posts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <Flame size={20} className="text-orange-500" /> Tendances
            </h2>
            <div className="flex flex-col gap-3">
              {trending.posts.map((post: any) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onClick={() => navigate(`/forum/post/${post.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Catégories */}
        {!searchActive && (
          <div>
            <h2 className="text-xl font-black mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-indigo-600" /> Catégories
            </h2>
            {catsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(categories as any[]).map((cat: any) => (
                  <CategoryCard
                    key={cat.id}
                    cat={cat}
                    onClick={() => navigate(`/forum/${cat.slug}`)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
