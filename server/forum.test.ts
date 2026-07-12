/**
 * Tests unitaires du Forum Doggle
 * Couvre : création de posts/replies, votes, réactions, bookmarks, signalements,
 *          modération, karma, recherche, validation des règles métier.
 *
 * Utilise un pool MySQL2 mocké via jest.mock.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Mock du pool DB ──────────────────────────────────────────────────────────

const mockExecute = vi.fn();
const mockPool = { execute: mockExecute };

vi.mock("./db", () => ({
  getPool: () => mockPool,
}));

// Import après le mock
import {
  forumGetCategories,
  forumGetPosts,
  forumGetPost,
  forumCreatePost,
  forumUpdatePost,
  forumSoftDeletePost,
  forumCreateReply,
  forumUpdateReply,
  forumVote,
  forumToggleReaction,
  forumToggleBookmark,
  forumGetMyBookmarks,
  forumGetMyPosts,
  forumAcceptAnswer,
  forumReport,
  forumPinPost,
  forumLockPost,
  forumSetPostStatus,
  forumSearch,
  forumGetUserKarma,
  forumReviewReport,
} from "./forumDb";

// ─── Utilitaires de test ──────────────────────────────────────────────────────

function mockRows(rows: any[]) {
  mockExecute.mockResolvedValueOnce([rows]);
}

function mockRow(row: any) {
  mockExecute.mockResolvedValueOnce([[row]]);
}

function mockEmpty() {
  mockExecute.mockResolvedValueOnce([[]]);
}

function mockCount(total: number) {
  mockExecute.mockResolvedValueOnce([[{ total }]]);
}

function mockInsert(insertId: number) {
  mockExecute.mockResolvedValueOnce([{ insertId, affectedRows: 1 }]);
}

function mockUpdate() {
  mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
}

// ─── Catégories ───────────────────────────────────────────────────────────────

describe("forumGetCategories", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("retourne toutes les catégories triées par position", async () => {
    const cats = [
      { id: 1, slug: "questions-generales", title: "Questions générales", position: 1 },
      { id: 2, slug: "sante-veterinaire", title: "Santé & Vétérinaire", position: 2 },
    ];
    mockRows(cats);
    const result = await forumGetCategories();
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("questions-generales");
  });

  it("retourne un tableau vide si erreur DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("DB down"));
    const result = await forumGetCategories();
    expect(result).toEqual([]);
  });
});

// ─── Posts ────────────────────────────────────────────────────────────────────

describe("forumGetPosts", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("retourne des posts paginés (page 1, limit 20)", async () => {
    const posts = [{ id: 1, title: "Mon golden retriever refuse de manger", upvotes: 5, downvotes: 1 }];
    mockRows(posts);
    mockCount(1);
    const result = await forumGetPosts({ page: 1, limit: 20 });
    expect(result.posts).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("filtre par categorySlug", async () => {
    mockRows([]);
    mockCount(0);
    await forumGetPosts({ categorySlug: "sante-veterinaire" });
    const callArgs = mockExecute.mock.calls[0];
    // La query doit inclure le slug
    expect(callArgs[0]).toContain("fc.slug = ?");
    expect(callArgs[1]).toContain("sante-veterinaire");
  });

  it("filtre par tag", async () => {
    mockRows([]);
    mockCount(0);
    await forumGetPosts({ tag: "labrador" });
    const callArgs = mockExecute.mock.calls[0];
    expect(callArgs[0]).toContain("JSON_CONTAINS");
    expect(callArgs[1]).toContain("labrador");
  });

  it("tri popular utilise (upvotes - downvotes)", async () => {
    mockRows([]);
    mockCount(0);
    await forumGetPosts({ sort: "popular" });
    const query = mockExecute.mock.calls[0][0];
    expect(query).toContain("fp.upvotes - fp.downvotes");
  });

  it("tri unanswered trie par replyCount ASC", async () => {
    mockRows([]);
    mockCount(0);
    await forumGetPosts({ sort: "unanswered" });
    const query = mockExecute.mock.calls[0][0];
    expect(query).toContain("replyCount ASC");
  });

  it("retourne total 0 si erreur DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Connection refused"));
    const result = await forumGetPosts({});
    expect(result.total).toBe(0);
    expect(result.posts).toEqual([]);
  });
});

describe("forumCreatePost", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("crée un post et incrément postCount de la catégorie", async () => {
    mockInsert(42);  // INSERT forum_posts
    mockUpdate();    // UPDATE forum_categories postCount
    const result = await forumCreatePost({
      categoryId: 3,
      authorId: 7,
      title: "Mon chien aboie toute la nuit",
      body: "Comment l'empêcher d'aboyer la nuit ? Il a 2 ans.",
      tags: ["comportement", "nuit"],
    });
    expect(result).toEqual({ id: 42 });
    expect(mockExecute).toHaveBeenCalledTimes(2);
  });

  it("sérialise les tags en JSON", async () => {
    mockInsert(99);
    mockUpdate();
    await forumCreatePost({ categoryId: 1, authorId: 1, title: "test titre long", body: "test contenu du post", tags: ["labrador", "santé"] });
    const insertCall = mockExecute.mock.calls[0];
    expect(insertCall[1]).toContain('["labrador","santé"]');
  });

  it("retourne null si erreur DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Duplicate entry"));
    const result = await forumCreatePost({ categoryId: 1, authorId: 1, title: "titre", body: "corps du message long" });
    expect(result).toBeNull();
  });
});

describe("forumUpdatePost", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("met à jour titre et body", async () => {
    mockUpdate();
    const result = await forumUpdatePost(1, { title: "Nouveau titre", body: "Nouveau contenu modifié" });
    expect(result).toBe(true);
    const query = mockExecute.mock.calls[0][0];
    expect(query).toContain("title = ?");
    expect(query).toContain("body = ?");
  });

  it("ne fait rien si aucun champ fourni", async () => {
    const result = await forumUpdatePost(1, {});
    expect(result).toBe(true);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("soft-delete met à jour deletedAt", async () => {
    mockUpdate();
    const result = await forumSoftDeletePost(42);
    expect(result).toBe(true);
    expect(mockExecute.mock.calls[0][0]).toContain("deletedAt = NOW()");
  });
});

// ─── Replies ─────────────────────────────────────────────────────────────────

describe("forumCreateReply", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("crée une réponse root (sans parentReplyId)", async () => {
    mockInsert(15);
    mockUpdate();  // replyCount
    const result = await forumCreateReply({ postId: 1, authorId: 5, body: "Très bonne question !" });
    expect(result).toEqual({ id: 15 });
    const insertArgs = mockExecute.mock.calls[0][1];
    expect(insertArgs[3]).toBeNull();  // parentReplyId = null
  });

  it("crée une sous-réponse avec parentReplyId", async () => {
    mockInsert(16);
    mockUpdate();
    const result = await forumCreateReply({ postId: 1, authorId: 6, body: "Je suis d'accord !", parentReplyId: 15 });
    expect(result).toEqual({ id: 16 });
    const insertArgs = mockExecute.mock.calls[0][1];
    expect(insertArgs[3]).toBe(15);
  });

  it("incrémente replyCount du post", async () => {
    mockInsert(17);
    mockUpdate();
    await forumCreateReply({ postId: 3, authorId: 2, body: "Excellent !" });
    const updateQuery = mockExecute.mock.calls[1][0];
    expect(updateQuery).toContain("replyCount = replyCount + 1");
    expect(mockExecute.mock.calls[1][1]).toContain(3);  // postId
  });
});

describe("forumUpdateReply", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("met à jour le body", async () => {
    mockUpdate();
    const result = await forumUpdateReply(5, "Corps modifié de la réponse");
    expect(result).toBe(true);
    expect(mockExecute.mock.calls[0][1]).toContain("Corps modifié de la réponse");
  });
});

// ─── Votes ────────────────────────────────────────────────────────────────────

describe("forumVote", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("crée un upvote si aucun vote existant", async () => {
    // Séquence DB : 1=SELECT existing, 2=INSERT vote, 3=UPDATE upvotes, 4=SELECT score
    mockEmpty();                             // 1. SELECT existing → aucun vote
    mockInsert(55);                          // 2. INSERT INTO forum_votes
    mockUpdate();                            // 3. UPDATE forum_posts SET upvotes
    mockRow({ upvotes: 6, downvotes: 1 }); // 4. SELECT score final
    const result = await forumVote(1, "post", 10, 1);
    expect(result?.userVote).toBe(1);
    expect(result?.score).toBe(5);  // 6-1
    expect(mockExecute.mock.calls[1][0]).toContain("INSERT INTO forum_votes");
    expect(mockExecute.mock.calls[2][0]).toContain("upvotes");
  });

  it("annule un vote si même valeur (toggle off)", async () => {
    // Séquence DB : 1=SELECT existing, 2=DELETE vote, 3=UPDATE upvotes--, 4=SELECT score
    mockRow({ id: 3, value: 1 });           // 1. vote existant +1
    mockUpdate();                            // 2. DELETE FROM forum_votes
    mockUpdate();                            // 3. UPDATE upvotes--
    mockRow({ upvotes: 4, downvotes: 1 }); // 4. SELECT score
    const result = await forumVote(1, "post", 10, 1);  // même valeur → annulation
    expect(result?.userVote).toBe(0);
    expect(mockExecute.mock.calls[1][0]).toContain("DELETE FROM forum_votes");
  });

  it("change le vote de +1 à -1 (inversion)", async () => {
    // Séquence : 1=SELECT existing, 2=UPDATE forum_votes value, 3=UPDATE forum_posts, 4=SELECT score
    mockRow({ id: 3, value: 1 });            // 1. vote existant +1
    mockUpdate();                             // 2. UPDATE forum_votes SET value = -1
    mockUpdate();                             // 3. UPDATE forum_posts SET downvotes++, upvotes--
    mockRow({ upvotes: 3, downvotes: 2 }); // 4. SELECT score final
    const result = await forumVote(1, "post", 10, -1);  // valeur opposée → inversion
    expect(result?.userVote).toBe(-1);
    expect(result?.score).toBe(1); // 3-2
  });

  it("retourne null si erreur DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Lock timeout"));
    const result = await forumVote(1, "post", 10, 1);
    expect(result).toBeNull();
  });
});

// ─── Réactions ────────────────────────────────────────────────────────────────

describe("forumToggleReaction", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("ajoute une réaction si elle n'existe pas", async () => {
    mockEmpty();   // SELECT → aucune réaction existante
    mockInsert(1); // INSERT
    const result = await forumToggleReaction(1, "post", 5, "heart");
    expect(result?.action).toBe("added");
  });

  it("supprime une réaction existante (toggle off)", async () => {
    mockRow({ id: 7 });  // réaction existante
    mockUpdate();         // DELETE
    const result = await forumToggleReaction(1, "post", 5, "heart");
    expect(result?.action).toBe("removed");
  });

  it("supporte les 5 emojis valides", async () => {
    const emojis = ["heart", "laugh", "celebrate", "eyes", "paw"] as const;
    for (const emoji of emojis) {
      mockEmpty();
      mockInsert(1);
      const r = await forumToggleReaction(1, "post", 1, emoji);
      expect(r?.action).toBe("added");
      mockExecute.mockClear();
    }
  });
});

// ─── Bookmarks ────────────────────────────────────────────────────────────────

describe("forumToggleBookmark", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("ajoute un bookmark si absent", async () => {
    mockEmpty();
    mockInsert(1);
    const result = await forumToggleBookmark(3, 12);
    expect(result?.bookmarked).toBe(true);
  });

  it("retire un bookmark existant", async () => {
    mockRow({ id: 5 });
    mockUpdate();
    const result = await forumToggleBookmark(3, 12);
    expect(result?.bookmarked).toBe(false);
  });
});

// ─── Meilleure réponse ────────────────────────────────────────────────────────

describe("forumAcceptAnswer", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("désélectionne l'ancienne réponse, sélectionne la nouvelle, passe le post en 'solved'", async () => {
    mockUpdate(); // RESET isAcceptedAnswer
    mockUpdate(); // SET isAcceptedAnswer = TRUE
    mockUpdate(); // status = 'solved'
    const result = await forumAcceptAnswer(10, 25);
    expect(result).toBe(true);
    expect(mockExecute).toHaveBeenCalledTimes(3);
    // Vérifier l'ordre des requêtes
    expect(mockExecute.mock.calls[0][0]).toContain("isAcceptedAnswer = FALSE");
    expect(mockExecute.mock.calls[1][0]).toContain("isAcceptedAnswer = TRUE");
    expect(mockExecute.mock.calls[2][0]).toContain("status = 'solved'");
  });
});

// ─── Signalements ─────────────────────────────────────────────────────────────

describe("forumReport", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("insère un signalement", async () => {
    mockInsert(1);
    const result = await forumReport({
      reporterId: 5,
      targetType: "post",
      targetId: 20,
      reason: "spam",
    });
    expect(result).toBe(true);
    expect(mockExecute.mock.calls[0][0]).toContain("INSERT IGNORE INTO forum_reports");
  });
});

// ─── Modération ───────────────────────────────────────────────────────────────

describe("forumPinPost / forumLockPost / forumSetPostStatus", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("épingle un post", async () => {
    mockUpdate();
    const r = await forumPinPost(5, true);
    expect(r).toBe(true);
    expect(mockExecute.mock.calls[0][0]).toContain("isPinned");
  });

  it("verrouille un post", async () => {
    mockUpdate();
    const r = await forumLockPost(5, true);
    expect(r).toBe(true);
    expect(mockExecute.mock.calls[0][0]).toContain("isLocked");
  });

  it("change le statut en 'closed'", async () => {
    mockUpdate();
    const r = await forumSetPostStatus(5, "closed");
    expect(r).toBe(true);
    expect(mockExecute.mock.calls[0][1]).toContain("closed");
  });
});

describe("forumReviewReport", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("traite un signalement en 'reviewed'", async () => {
    mockUpdate();
    const r = await forumReviewReport(3, "reviewed");
    expect(r).toBe(true);
    expect(mockExecute.mock.calls[0][1]).toContain("reviewed");
  });

  it("rejette un signalement en 'dismissed'", async () => {
    mockUpdate();
    const r = await forumReviewReport(3, "dismissed");
    expect(r).toBe(true);
    expect(mockExecute.mock.calls[0][1]).toContain("dismissed");
  });
});

// ─── Recherche ────────────────────────────────────────────────────────────────

describe("forumSearch", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("effectue une recherche LIKE sur titre et body", async () => {
    mockRows([{ id: 1, title: "Golden Retriever et alimentation" }]);
    const results = await forumSearch("golden", 10);
    expect(results).toHaveLength(1);
    const [query, params] = mockExecute.mock.calls[0];
    expect(query).toContain("LIKE ?");
    expect(params).toContain("%golden%");
  });

  it("retourne un tableau vide si aucun résultat", async () => {
    mockRows([]);
    const results = await forumSearch("xyznotfound");
    expect(results).toEqual([]);
  });

  it("retourne un tableau vide si erreur DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Query timeout"));
    const results = await forumSearch("labrador");
    expect(results).toEqual([]);
  });
});

// ─── Karma ────────────────────────────────────────────────────────────────────

describe("forumGetUserKarma", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("additionne les upvotes de posts ET replies", async () => {
    mockRow({ k: 42 });  // posts karma
    mockRow({ k: 13 });  // replies karma
    const karma = await forumGetUserKarma(7);
    expect(karma).toBe(55);  // 42 + 13
  });

  it("retourne 0 si aucun post/reply", async () => {
    mockRow({ k: 0 });
    mockRow({ k: 0 });
    const karma = await forumGetUserKarma(999);
    expect(karma).toBe(0);
  });

  it("retourne 0 si erreur DB", async () => {
    mockExecute.mockRejectedValueOnce(new Error("Connection error"));
    const karma = await forumGetUserKarma(1);
    expect(karma).toBe(0);
  });
});

// ─── Règles métier ────────────────────────────────────────────────────────────

describe("Règles métier forum", () => {
  beforeEach(() => { mockExecute.mockClear(); });

  it("un vote de value=1 incrémente upvotes (pas downvotes)", async () => {
    mockEmpty();   // pas de vote existant → SELECT [[]]
    mockInsert(1); // INSERT forum_votes
    mockUpdate();  // UPDATE upvotes
    mockRow({ upvotes: 11, downvotes: 2 }); // SELECT score final
    const r = await forumVote(1, "reply", 7, 1);
    expect(r?.upvotes).toBe(11);
    expect(r?.downvotes).toBe(2);
    // Vérifier que la query de mise à jour concerne bien 'upvotes'
    // calls[0] = SELECT, calls[1] = INSERT, calls[2] = UPDATE upvotes, calls[3] = SELECT score
    const insertCall = mockExecute.mock.calls[1][0];
    expect(insertCall).toContain("INSERT INTO forum_votes");
    const updateQuery = mockExecute.mock.calls[2][0];
    expect(updateQuery).toContain("upvotes");
  });

  it("forumAcceptAnswer appelle exactement 3 fois la DB (reset, set, status)", async () => {
    mockUpdate();
    mockUpdate();
    mockUpdate();
    await forumAcceptAnswer(1, 5);
    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it("forumSoftDeletePost ne supprime pas physiquement la ligne", async () => {
    mockUpdate();
    await forumSoftDeletePost(20);
    const query = mockExecute.mock.calls[0][0];
    expect(query).not.toContain("DELETE");
    expect(query).toContain("deletedAt");
  });
});
