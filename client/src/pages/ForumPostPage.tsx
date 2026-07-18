import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, ThumbsUp, ThumbsDown, Bookmark, BookmarkCheck, Flag, MessageSquare,
  CheckCircle2, Lock, Share2, Edit2, Trash2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Emojis de réaction ───────────────────────────────────────────────────────

const REACTION_EMOJIS: Record<string, string> = {
  heart: "❤️", laugh: "😂", celebrate: "🎉", eyes: "👀", paw: "🐾",
};

type ReactionType = "heart" | "laugh" | "celebrate" | "eyes" | "paw";

// ─── Picker de réactions ──────────────────────────────────────────────────────

function ReactionPicker({ targetType, targetId, reactions }: {
  targetType: "post" | "reply";
  targetId: number;
  reactions: any[];
}) {
  const [open, setOpen] = useState(false);
  
  const reactMutation = trpc.forum.react.useMutation({
    onSuccess: () => { },
    onError: () => toast("Connexion requise", { description: "Connectez-vous pour réagir" }),
  });

  // Agréger par emoji
  const counts: Record<string, number> = {};
  for (const r of reactions) {
    if (r.targetType === targetType && r.targetId === targetId) {
      counts[r.emoji] = (counts[r.emoji] || 0) + Number(r.count);
    }
  }

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-1 flex-wrap">
        {(Object.entries(counts) as [ReactionType, number][]).filter(([, c]) => c > 0).map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => reactMutation.mutate({ targetType, targetId, emoji })}
            className="text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-1 rounded-full font-medium transition-all flex items-center gap-1"
          >
            {REACTION_EMOJIS[emoji]} {count}
          </button>
        ))}
        <button
          onClick={() => setOpen(!open)}
          className="text-sm bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-full text-muted-foreground transition-all"
        >
          +
        </button>
      </div>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 bg-white border-2 border-black rounded-xl p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex gap-1 z-50">
          {(Object.entries(REACTION_EMOJIS) as [ReactionType, string][]).map(([key, emoji]) => (
            <button
              key={key}
              onClick={() => { reactMutation.mutate({ targetType, targetId, emoji: key }); setOpen(false); }}
              className="text-xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Boutons de vote ──────────────────────────────────────────────────────────

function VoteButtons({ targetType, targetId, initialScore, userVote }: {
  targetType: "post" | "reply";
  targetId: number;
  initialScore: number;
  userVote: number;
}) {
  const [vote, setVote] = useState(userVote);
  const [score, setScore] = useState(initialScore);

  const voteMutation = trpc.forum.vote.useMutation({
    onSuccess: (data) => {
      setVote(data.userVote);
      setScore(data.score);
    },
    onError: () => toast("Connectez-vous pour voter"),
  });

  const handleVote = (value: 1 | -1) => {
    voteMutation.mutate({ targetType, targetId, value });
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote(1)}
        disabled={voteMutation.isPending}
        className={`p-1.5 rounded-lg border-2 transition-all font-black text-sm
          ${vote === 1
            ? "bg-green-500 border-green-500 text-white shadow-none"
            : "border-slate-300 text-slate-500 hover:border-green-400 hover:text-green-600 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]"
          }`}
      >
        <ThumbsUp size={14} />
      </button>
      <span className={`text-sm font-black min-w-[28px] text-center
        ${score > 0 ? "text-green-600" : score < 0 ? "text-red-500" : "text-slate-400"}`}
      >
        {score > 0 ? "+" : ""}{score}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={voteMutation.isPending}
        className={`p-1.5 rounded-lg border-2 transition-all
          ${vote === -1
            ? "bg-red-500 border-red-500 text-white shadow-none"
            : "border-slate-300 text-slate-500 hover:border-red-400 hover:text-red-600 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]"
          }`}
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
}

// ─── Carte de Réponse ─────────────────────────────────────────────────────────

function ReplyCard({
  reply, postId, postAuthorId, reactions, currentUserId, onReply, onRefetch
}: {
  reply: any;
  postId: number;
  postAuthorId: number;
  reactions: any[];
  currentUserId?: number;
  onReply?: (replyId: number, authorName: string) => void;
  onRefetch: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(reply.body);
  

  const updateMutation = trpc.forum.updateReply.useMutation({
    onSuccess: () => { setEditing(false); onRefetch(); },
    onError: () => toast("Erreur", { description: "Modification impossible" }),
  });

  const deleteMutation = trpc.forum.deleteReply.useMutation({
    onSuccess: () => onRefetch(),
    onError: () => toast("Erreur", { description: "Suppression impossible" }),
  });

  const acceptMutation = trpc.forum.acceptAnswer.useMutation({
    onSuccess: () => { toast("✅ Réponse acceptée !"); onRefetch(); },
    onError: () => toast("Erreur"),
  });

  const daysAgo = Math.floor((Date.now() - new Date(reply.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div
      id={`reply-${reply.id}`}
      className={`relative p-4 rounded-xl border-2 transition-all
        ${reply.isAcceptedAnswer
          ? "border-green-400 bg-green-50 shadow-[3px_3px_0px_0px_rgba(34,197,94,0.4)]"
          : reply.parentReplyId
            ? "border-slate-200 bg-slate-50 ml-8"
            : "border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        }`}
    >
      {reply.isAcceptedAnswer && (
        <div className="flex items-center gap-1.5 mb-2 text-green-700 font-black text-xs">
          <CheckCircle2 size={14} /> Meilleure réponse
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-xs font-black">
          {reply.authorName?.[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="font-bold text-sm text-foreground">{reply.authorName}</span>
        <span className="text-xs text-muted-foreground">
          {daysAgo === 0 ? "aujourd'hui" : `il y a ${daysAgo}j`}
          {reply.updatedAt !== reply.createdAt && " · modifié"}
        </span>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-1">
          {currentUserId === reply.authorId && !editing && (
            <>
              <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => deleteMutation.mutate({ replyId: reply.id })}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {currentUserId === postAuthorId && !reply.isAcceptedAnswer && (
            <button
              onClick={() => acceptMutation.mutate({ postId, replyId: reply.id })}
              className="text-xs font-bold text-green-600 hover:text-green-700 border border-green-300 px-2 py-0.5 rounded-full hover:bg-green-50 transition-all"
            >
              ✓ Accepter
            </button>
          )}
        </div>
      </div>

      {/* Corps */}
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            className="min-h-24 font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => updateMutation.mutate({ replyId: reply.id, body: editBody })} disabled={updateMutation.isPending}>
              Sauvegarder
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {reply.deletedAt ? (
            <span className="italic text-muted-foreground">[Réponse supprimée]</span>
          ) : reply.body}
        </div>
      )}

      {/* Footer */}
      {!reply.deletedAt && (
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <VoteButtons
            targetType="reply"
            targetId={reply.id}
            initialScore={(reply.upvotes ?? 0) - (reply.downvotes ?? 0)}
            userVote={reply.userVote ?? 0}
          />
          <ReactionPicker targetType="reply" targetId={reply.id} reactions={reactions} />
          {onReply && (
            <button
              onClick={() => onReply(reply.id, reply.authorName)}
              className="text-xs font-bold text-muted-foreground hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <MessageSquare size={12} /> Répondre
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page Post ────────────────────────────────────────────────────────────────

export default function ForumPostPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  
  const postId = parseInt(id ?? "0");

  const [replyBody, setReplyBody] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | undefined>();
  const [replyingToName, setReplyingToName] = useState<string | undefined>();
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // userId courant (undefined si non connecté)
  const currentUserId: number | undefined = undefined;

  const { data: post, refetch, isLoading } = trpc.forum.getPost.useQuery(
    { postId },
    { enabled: postId > 0 }
  );

  const createReplyMutation = trpc.forum.createReply.useMutation({
    onSuccess: () => {
      setReplyBody("");
      setReplyingToId(undefined);
      setReplyingToName(undefined);
      toast("✅ Réponse publiée !");
      refetch();
    },
    onError: (e: any) => toast("Erreur", { description: e.message }),
  });

  const bookmarkMutation = trpc.forum.bookmark.useMutation({
    onSuccess: (data: any) => {
      toast(data?.bookmarked ? "📌 Sauvegardé" : "Supprimé des sauvegardes");
    },
    onError: () => toast("Connectez-vous pour sauvegarder"),
  });

  const reportMutation = trpc.forum.report.useMutation({
    onSuccess: () => toast("✅ Signalement envoyé"),
    onError: () => toast("Connectez-vous pour signaler"),
  });

  const handleReplyToReply = (replyId: number, authorName: string) => {
    setReplyingToId(replyId);
    setReplyingToName(authorName);
    replyRef.current?.focus();
  };

  const handleSubmitReply = () => {
    if (!replyBody.trim() || replyBody.length < 2) return;
    createReplyMutation.mutate({
      postId,
      body: replyBody,
      parentReplyId: replyingToId,
    });
  };

  const score = post ? (post.upvotes ?? 0) - (post.downvotes ?? 0) : 0;
  const rootReplies = (post?.replies ?? []).filter((r: any) => !r.parentReplyId);
  const childRepliesOf = (parentId: number) =>
    (post?.replies ?? []).filter((r: any) => r.parentReplyId === parentId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium">Chargement du post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-black mb-4">Post introuvable</p>
          <Button onClick={() => navigate("/forum")}>← Retour au forum</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-white border-b-2 border-black px-4 py-4 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(post.categorySlug ? `/forum/${post.categorySlug}` : "/forum")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground font-semibold text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            <span>{post.categoryIcon} {post.categoryTitle}</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {post.status === "solved" && (
              <span className="text-xs bg-green-100 text-green-700 border border-green-300 px-2 py-1 rounded-full font-black flex items-center gap-1">
                <CheckCircle2 size={12} /> Résolu
              </span>
            )}
            {post.status === "closed" && (
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-black">Fermé</span>
            )}
            {post.isLocked && (
              <Lock size={16} className="text-amber-500" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-6">
        {/* Post principal */}
        <div className="bg-white rounded-2xl border-2 border-black shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] p-6 mb-6">
          {/* Tags */}
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {post.tags.map((tag: string) => (
                <span key={tag} className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-2xl font-black text-foreground leading-tight mb-4">{post.title}</h1>

          {/* Auteur */}
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black">
              {post.authorName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{post.authorName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                {" · "}{post.viewCount ?? 0} vue{(post.viewCount ?? 0) > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Corps du post */}
          <div className="text-base text-foreground leading-relaxed whitespace-pre-wrap break-words mb-6">
            {post.body}
          </div>

          {/* Footer post */}
          <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-slate-100">
            <VoteButtons
              targetType="post"
              targetId={post.id}
              initialScore={score}
              userVote={post.userPostVote ?? 0}
            />
            <ReactionPicker targetType="post" targetId={post.id} reactions={post.reactions ?? []} />

            <button
              onClick={() => bookmarkMutation.mutate({ postId: post.id })}
              className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 transition-all
                ${post.userBookmarked
                  ? "bg-amber-400 border-amber-400 text-amber-900"
                  : "border-slate-300 text-slate-500 hover:border-amber-400 hover:text-amber-600 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]"
                }`}
            >
              {post.userBookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
              {post.userBookmarked ? "Sauvegardé" : "Sauvegarder"}
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast("Lien copié !");
              }}
              className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)] transition-all"
            >
              <Share2 size={13} /> Partager
            </button>

            <button
              onClick={() => reportMutation.mutate({ targetType: "post", targetId: post.id, reason: "spam" })}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors ml-auto"
            >
              <Flag size={12} /> Signaler
            </button>
          </div>
        </div>

        {/* Zone de réponse */}
        {!post.isLocked && (
          <div className="bg-white rounded-2xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] p-5 mb-6">
            <h3 className="font-black text-sm mb-3 flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-600" />
              {replyingToName ? `Répondre à @${replyingToName}` : "Votre réponse"}
              {replyingToName && (
                <button
                  onClick={() => { setReplyingToId(undefined); setReplyingToName(undefined); }}
                  className="text-xs text-muted-foreground hover:text-foreground ml-2"
                >
                  ✕ Annuler
                </button>
              )}
            </h3>
            <Textarea
              ref={replyRef}
              placeholder={replyingToName
                ? `Répondre à @${replyingToName}...`
                : "Écrivez votre réponse... (Markdown supporté)"}
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              className="min-h-32 font-mono text-sm mb-3 border-2 border-slate-200 focus:border-indigo-400"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{replyBody.length}/20000 caractères</span>
              <Button
                onClick={handleSubmitReply}
                disabled={replyBody.length < 2 || createReplyMutation.isPending}
                className="font-black bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                {createReplyMutation.isPending ? "Publication..." : "📤 Publier"}
              </Button>
            </div>
          </div>
        )}

        {/* Section des réponses */}
        <div className="mb-8">
          <h2 className="font-black text-lg mb-4 flex items-center gap-2">
            <MessageSquare size={18} className="text-indigo-600" />
            {post.replyCount ?? 0} réponse{(post.replyCount ?? 0) > 1 ? "s" : ""}
          </h2>

          {(post?.replies ?? []).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare size={40} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">Pas encore de réponse. Soyez le premier !</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {rootReplies.map((reply: any) => (
                <div key={reply.id}>
                  <ReplyCard
                    reply={reply}
                    postId={postId}
                    postAuthorId={post.authorId}
                    reactions={post.reactions ?? []}
                    currentUserId={currentUserId}
                    onReply={handleReplyToReply}
                    onRefetch={refetch}
                  />
                  {/* Sous-réponses */}
                  {childRepliesOf(reply.id).map((child: any) => (
                    <div key={child.id} className="mt-2">
                      <ReplyCard
                        reply={child}
                        postId={postId}
                        postAuthorId={post.authorId}
                        reactions={post.reactions ?? []}
                        currentUserId={currentUserId}
                        onRefetch={refetch}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
