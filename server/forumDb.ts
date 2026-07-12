/**
 * Forum DB — Fonctions de base de données pour le forum communautaire Doggle
 * Toutes les requêtes utilisent le pool MySQL2 brut (pas Drizzle ORM)
 * pour rester cohérent avec le pattern existant du projet.
 */

import { getPool } from "./db";

// ─── Catégories ───────────────────────────────────────────────────────────────

export async function forumGetCategories() {
  const pool = getPool();
  if (!pool) { console.warn("[Database] Forum categories: no DB"); return []; }
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM forum_categories ORDER BY position ASC`
    );
    return rows as any[];
  } catch (e) {
    console.error("[Database] Cannot get forum categories:", e);
    return [];
  }
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function forumGetPosts(opts: {
  categorySlug?: string;
  sort?: "recent" | "popular" | "unanswered" | "trending";
  tag?: string;
  page?: number;
  limit?: number;
}) {
  const pool = getPool();
  if (!pool) { console.warn("[Database] Forum posts: no DB"); return { posts: [], total: 0 }; }
  try {
    const limit = opts.limit ?? 20;
    const offset = ((opts.page ?? 1) - 1) * limit;

    let orderBy = "fp.createdAt DESC";
    if (opts.sort === "popular")    orderBy = "(fp.upvotes - fp.downvotes) DESC, fp.createdAt DESC";
    if (opts.sort === "unanswered") orderBy = "fp.replyCount ASC, fp.createdAt DESC";
    if (opts.sort === "trending")   orderBy = "(fp.upvotes - fp.downvotes + fp.viewCount * 0.1) DESC";

    const conditions: string[] = ["fp.deletedAt IS NULL"];
    const params: any[] = [];

    if (opts.categorySlug) {
      conditions.push("fc.slug = ?");
      params.push(opts.categorySlug);
    }
    if (opts.tag) {
      conditions.push("JSON_CONTAINS(fp.tags, JSON_QUOTE(?))");
      params.push(opts.tag);
    }

    const where = conditions.join(" AND ");

    const [rows] = await pool.execute(
      `SELECT fp.*, fc.slug AS categorySlug, fc.title AS categoryTitle, fc.icon AS categoryIcon, fc.color AS categoryColor,
              u.name AS authorName, u.profilePhotoUrl AS authorPhoto
       FROM forum_posts fp
       JOIN forum_categories fc ON fc.id = fp.categoryId
       JOIN users u ON u.id = fp.authorId
       WHERE ${where}
       ORDER BY fp.isPinned DESC, ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[countRow]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM forum_posts fp
       JOIN forum_categories fc ON fc.id = fp.categoryId
       WHERE ${where}`,
      params
    ) as any;

    return { posts: rows as any[], total: Number(countRow?.total ?? 0) };
  } catch (e) {
    console.error("[Database] Cannot get forum posts:", e);
    return { posts: [], total: 0 };
  }
}

export async function forumGetPost(postId: number, userId?: number) {
  const pool = getPool();
  if (!pool) { console.warn("[Database] Forum get post: no DB"); return null; }
  try {
    await pool.execute(
      `UPDATE forum_posts SET viewCount = viewCount + 1 WHERE id = ?`, [postId]
    );

    const [[post]] = await pool.execute(
      `SELECT fp.*, fc.slug AS categorySlug, fc.title AS categoryTitle, fc.icon AS categoryIcon, fc.color AS categoryColor,
              u.name AS authorName, u.profilePhotoUrl AS authorPhoto
       FROM forum_posts fp
       JOIN forum_categories fc ON fc.id = fp.categoryId
       JOIN users u ON u.id = fp.authorId
       WHERE fp.id = ? AND fp.deletedAt IS NULL`,
      [postId]
    ) as any;

    if (!post) return null;

    const [replies] = await pool.execute(
      `SELECT fr.*, u.name AS authorName, u.profilePhotoUrl AS authorPhoto
       FROM forum_replies fr
       JOIN users u ON u.id = fr.authorId
       WHERE fr.postId = ? AND fr.deletedAt IS NULL
       ORDER BY fr.isAcceptedAnswer DESC, fr.upvotes DESC, fr.createdAt ASC`,
      [postId]
    ) as any;

    let userPostVote = 0;
    let userBookmarked = false;
    const userReplyVotes: Record<number, number> = {};

    if (userId) {
      const [[voteRow]] = await pool.execute(
        `SELECT value FROM forum_votes WHERE userId = ? AND targetType = 'post' AND targetId = ?`,
        [userId, postId]
      ) as any;
      userPostVote = voteRow?.value ?? 0;

      const [[bkRow]] = await pool.execute(
        `SELECT id FROM forum_bookmarks WHERE userId = ? AND postId = ?`,
        [userId, postId]
      ) as any;
      userBookmarked = !!bkRow;

      if (replies.length > 0) {
        const replyIds = (replies as any[]).map((r: any) => r.id);
        const [replyVoteRows] = await pool.execute(
          `SELECT targetId, value FROM forum_votes WHERE userId = ? AND targetType = 'reply' AND targetId IN (${replyIds.map(() => "?").join(",")})`,
          [userId, ...replyIds]
        ) as any;
        for (const rv of replyVoteRows as any[]) {
          userReplyVotes[rv.targetId] = rv.value;
        }
      }
    }

    const [reactions] = await pool.execute(
      `SELECT targetType, targetId, emoji, COUNT(*) AS count
       FROM forum_reactions
       WHERE (targetType = 'post' AND targetId = ?)
          OR (targetType = 'reply' AND targetId IN (SELECT id FROM forum_replies WHERE postId = ?))
       GROUP BY targetType, targetId, emoji`,
      [postId, postId]
    ) as any;

    return {
      ...post,
      userPostVote,
      userBookmarked,
      replies: (replies as any[]).map((r: any) => ({
        ...r,
        userVote: userReplyVotes[r.id] ?? 0,
      })),
      reactions: reactions as any[],
    };
  } catch (e) {
    console.error("[Database] Cannot get forum post:", e);
    return null;
  }
}

export async function forumCreatePost(data: {
  categoryId: number;
  authorId: number;
  title: string;
  body: string;
  tags?: string[];
}) {
  const pool = getPool();
  if (!pool) { console.warn("[Database] Forum create post: no DB"); return null; }
  try {
    const [result] = await pool.execute(
      `INSERT INTO forum_posts (categoryId, authorId, title, body, tags) VALUES (?, ?, ?, ?, ?)`,
      [data.categoryId, data.authorId, data.title, data.body, JSON.stringify(data.tags ?? [])]
    ) as any;
    await pool.execute(
      `UPDATE forum_categories SET postCount = postCount + 1 WHERE id = ?`, [data.categoryId]
    );
    return { id: result.insertId };
  } catch (e) {
    console.error("[Database] Cannot create forum post:", e);
    return null;
  }
}

export async function forumUpdatePost(postId: number, data: { title?: string; body?: string; tags?: string[] }) {
  const pool = getPool();
  if (!pool) return false;
  try {
    const sets: string[] = [];
    const params: any[] = [];
    if (data.title !== undefined) { sets.push("title = ?"); params.push(data.title); }
    if (data.body !== undefined)  { sets.push("body = ?");  params.push(data.body); }
    if (data.tags !== undefined)  { sets.push("tags = ?");  params.push(JSON.stringify(data.tags)); }
    if (!sets.length) return true;
    params.push(postId);
    await pool.execute(`UPDATE forum_posts SET ${sets.join(", ")} WHERE id = ?`, params);
    return true;
  } catch (e) { console.error("[Database] Cannot update forum post:", e); return false; }
}

export async function forumSoftDeletePost(postId: number) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(`UPDATE forum_posts SET deletedAt = NOW() WHERE id = ?`, [postId]);
    return true;
  } catch (e) { return false; }
}

// ─── Replies ─────────────────────────────────────────────────────────────────

export async function forumCreateReply(data: {
  postId: number;
  authorId: number;
  body: string;
  parentReplyId?: number;
}) {
  const pool = getPool();
  if (!pool) { console.warn("[Database] Forum create reply: no DB"); return null; }
  try {
    const [result] = await pool.execute(
      `INSERT INTO forum_replies (postId, authorId, body, parentReplyId) VALUES (?, ?, ?, ?)`,
      [data.postId, data.authorId, data.body, data.parentReplyId ?? null]
    ) as any;
    await pool.execute(
      `UPDATE forum_posts SET replyCount = replyCount + 1 WHERE id = ?`, [data.postId]
    );
    return { id: result.insertId };
  } catch (e) {
    console.error("[Database] Cannot create forum reply:", e);
    return null;
  }
}

export async function forumUpdateReply(replyId: number, body: string) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(`UPDATE forum_replies SET body = ? WHERE id = ?`, [body, replyId]);
    return true;
  } catch (e) { return false; }
}

export async function forumSoftDeleteReply(replyId: number) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(`UPDATE forum_replies SET deletedAt = NOW() WHERE id = ?`, [replyId]);
    return true;
  } catch (e) { return false; }
}

// ─── Votes ────────────────────────────────────────────────────────────────────

/**
 * Vote sur un post ou reply.
 * - Pas de vote existant → insérer
 * - Même valeur → annuler (toggle off)
 * - Valeur opposée → changer
 */
export async function forumVote(
  userId: number,
  targetType: "post" | "reply",
  targetId: number,
  value: 1 | -1
) {
  const pool = getPool();
  if (!pool) return null;
  try {
    const [[existing]] = await pool.execute(
      `SELECT id, value FROM forum_votes WHERE userId = ? AND targetType = ? AND targetId = ?`,
      [userId, targetType, targetId]
    ) as any;

    const table = targetType === "post" ? "forum_posts" : "forum_replies";
    let newUserVote: number;

    if (!existing) {
      await pool.execute(
        `INSERT INTO forum_votes (userId, targetType, targetId, value) VALUES (?, ?, ?, ?)`,
        [userId, targetType, targetId, value]
      );
      const col = value === 1 ? "upvotes" : "downvotes";
      await pool.execute(`UPDATE ${table} SET ${col} = ${col} + 1 WHERE id = ?`, [targetId]);
      newUserVote = value;
    } else if (existing.value === value) {
      await pool.execute(`DELETE FROM forum_votes WHERE id = ?`, [existing.id]);
      const col = value === 1 ? "upvotes" : "downvotes";
      await pool.execute(`UPDATE ${table} SET ${col} = GREATEST(0, ${col} - 1) WHERE id = ?`, [targetId]);
      newUserVote = 0;
    } else {
      await pool.execute(`UPDATE forum_votes SET value = ? WHERE id = ?`, [value, existing.id]);
      if (value === 1) {
        await pool.execute(
          `UPDATE ${table} SET upvotes = upvotes + 1, downvotes = GREATEST(0, downvotes - 1) WHERE id = ?`,
          [targetId]
        );
      } else {
        await pool.execute(
          `UPDATE ${table} SET downvotes = downvotes + 1, upvotes = GREATEST(0, upvotes - 1) WHERE id = ?`,
          [targetId]
        );
      }
      newUserVote = value;
    }

    const [[scoreRow]] = await pool.execute(
      `SELECT upvotes, downvotes FROM ${table} WHERE id = ?`, [targetId]
    ) as any;

    return {
      userVote: newUserVote,
      upvotes: Number(scoreRow?.upvotes ?? 0),
      downvotes: Number(scoreRow?.downvotes ?? 0),
      score: Number(scoreRow?.upvotes ?? 0) - Number(scoreRow?.downvotes ?? 0),
    };
  } catch (e) {
    console.error("[Database] Cannot process forum vote:", e);
    return null;
  }
}

// ─── Réactions ────────────────────────────────────────────────────────────────

export async function forumToggleReaction(
  userId: number,
  targetType: "post" | "reply",
  targetId: number,
  emoji: "heart" | "laugh" | "celebrate" | "eyes" | "paw"
) {
  const pool = getPool();
  if (!pool) return null;
  try {
    const [[existing]] = await pool.execute(
      `SELECT id FROM forum_reactions WHERE userId = ? AND targetType = ? AND targetId = ? AND emoji = ?`,
      [userId, targetType, targetId, emoji]
    ) as any;
    if (existing) {
      await pool.execute(`DELETE FROM forum_reactions WHERE id = ?`, [existing.id]);
      return { action: "removed" as const };
    } else {
      await pool.execute(
        `INSERT INTO forum_reactions (userId, targetType, targetId, emoji) VALUES (?, ?, ?, ?)`,
        [userId, targetType, targetId, emoji]
      );
      return { action: "added" as const };
    }
  } catch (e) { console.error("[Database] Cannot toggle reaction:", e); return null; }
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export async function forumToggleBookmark(userId: number, postId: number) {
  const pool = getPool();
  if (!pool) return null;
  try {
    const [[existing]] = await pool.execute(
      `SELECT id FROM forum_bookmarks WHERE userId = ? AND postId = ?`,
      [userId, postId]
    ) as any;
    if (existing) {
      await pool.execute(`DELETE FROM forum_bookmarks WHERE id = ?`, [existing.id]);
      return { bookmarked: false };
    } else {
      await pool.execute(
        `INSERT INTO forum_bookmarks (userId, postId) VALUES (?, ?)`, [userId, postId]
      );
      return { bookmarked: true };
    }
  } catch (e) { console.error("[Database] Cannot toggle bookmark:", e); return null; }
}

export async function forumGetMyBookmarks(userId: number) {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT fp.id, fp.title, fp.upvotes, fp.replyCount, fp.status, fp.createdAt,
              fc.slug AS categorySlug, fc.icon AS categoryIcon
       FROM forum_bookmarks fb
       JOIN forum_posts fp ON fp.id = fb.postId
       JOIN forum_categories fc ON fc.id = fp.categoryId
       WHERE fb.userId = ? AND fp.deletedAt IS NULL
       ORDER BY fb.createdAt DESC`,
      [userId]
    );
    return rows as any[];
  } catch (e) { return []; }
}

export async function forumGetMyPosts(userId: number) {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT fp.id, fp.title, fp.status, fp.upvotes, fp.replyCount, fp.createdAt,
              fc.slug AS categorySlug, fc.icon AS categoryIcon, fc.title AS categoryTitle
       FROM forum_posts fp
       JOIN forum_categories fc ON fc.id = fp.categoryId
       WHERE fp.authorId = ? AND fp.deletedAt IS NULL
       ORDER BY fp.createdAt DESC`,
      [userId]
    );
    return rows as any[];
  } catch (e) { return []; }
}

// ─── Meilleure réponse ────────────────────────────────────────────────────────

export async function forumAcceptAnswer(postId: number, replyId: number) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `UPDATE forum_replies SET isAcceptedAnswer = FALSE WHERE postId = ?`, [postId]
    );
    await pool.execute(
      `UPDATE forum_replies SET isAcceptedAnswer = TRUE WHERE id = ? AND postId = ?`, [replyId, postId]
    );
    await pool.execute(
      `UPDATE forum_posts SET status = 'solved' WHERE id = ?`, [postId]
    );
    return true;
  } catch (e) { return false; }
}

// ─── Signalements ─────────────────────────────────────────────────────────────

export async function forumReport(data: {
  reporterId: number;
  targetType: "post" | "reply";
  targetId: number;
  reason: "spam" | "inappropriate" | "harassment" | "misinformation" | "other";
}) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `INSERT IGNORE INTO forum_reports (reporterId, targetType, targetId, reason) VALUES (?, ?, ?, ?)`,
      [data.reporterId, data.targetType, data.targetId, data.reason]
    );
    return true;
  } catch (e) { return false; }
}

// ─── Modération ───────────────────────────────────────────────────────────────

export async function forumPinPost(postId: number, isPinned: boolean) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(`UPDATE forum_posts SET isPinned = ? WHERE id = ?`, [isPinned, postId]);
    return true;
  } catch (e) { return false; }
}

export async function forumLockPost(postId: number, isLocked: boolean) {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(`UPDATE forum_posts SET isLocked = ? WHERE id = ?`, [isLocked, postId]);
    return true;
  } catch (e) { return false; }
}

export async function forumSetPostStatus(postId: number, status: "open" | "solved" | "closed") {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(`UPDATE forum_posts SET status = ? WHERE id = ?`, [status, postId]);
    return true;
  } catch (e) { return false; }
}

export async function forumGetPendingReports() {
  const pool = getPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.execute(
      `SELECT fr.*, u.name AS reporterName FROM forum_reports fr
       JOIN users u ON u.id = fr.reporterId
       WHERE fr.status = 'pending' ORDER BY fr.createdAt DESC`
    );
    return rows as any[];
  } catch (e) { return []; }
}

export async function forumReviewReport(reportId: number, status: "reviewed" | "dismissed") {
  const pool = getPool();
  if (!pool) return false;
  try {
    await pool.execute(
      `UPDATE forum_reports SET status = ? WHERE id = ?`, [status, reportId]
    );
    return true;
  } catch (e) { return false; }
}

// ─── Recherche ────────────────────────────────────────────────────────────────

export async function forumSearch(query: string, limit = 20) {
  const pool = getPool();
  if (!pool) return [];
  try {
    const q = `%${query}%`;
    const [rows] = await pool.execute(
      `SELECT fp.id, fp.title, fp.body, fp.upvotes, fp.replyCount, fp.createdAt,
              fc.slug AS categorySlug, fc.title AS categoryTitle, fc.icon AS categoryIcon,
              u.name AS authorName
       FROM forum_posts fp
       JOIN forum_categories fc ON fc.id = fp.categoryId
       JOIN users u ON u.id = fp.authorId
       WHERE fp.deletedAt IS NULL AND (fp.title LIKE ? OR fp.body LIKE ?)
       ORDER BY (fp.upvotes - fp.downvotes) DESC, fp.createdAt DESC
       LIMIT ?`,
      [q, q, limit]
    );
    return rows as any[];
  } catch (e) { console.error("[Database] Forum search error:", e); return []; }
}

// ─── Karma ────────────────────────────────────────────────────────────────────

export async function forumGetUserKarma(userId: number): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  try {
    const [[r1]] = await pool.execute(
      `SELECT COALESCE(SUM(upvotes), 0) AS k FROM forum_posts WHERE authorId = ? AND deletedAt IS NULL`,
      [userId]
    ) as any;
    const [[r2]] = await pool.execute(
      `SELECT COALESCE(SUM(upvotes), 0) AS k FROM forum_replies WHERE authorId = ? AND deletedAt IS NULL`,
      [userId]
    ) as any;
    return Number(r1?.k ?? 0) + Number(r2?.k ?? 0);
  } catch (e) { return 0; }
}
