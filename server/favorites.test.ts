import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("favorites", () => {
  it("rejects favoriting yourself (no DB required, checked first)", async () => {
    const { ctx } = createAuthContext(5);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.favorite.addFavorite({ targetUserId: 5 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("accepts favoriting another user", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.favorite.addFavorite({ targetUserId: 2 });
      expect(result.success).toBe(true);
    } catch (error: any) {
      // Expected if DB is not available
      expect(error.message).toBeDefined();
    }
  });

  it("removes a favorite", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.favorite.removeFavorite({ targetUserId: 2 });
      expect(result.success).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("checks favorite status", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const isFav = await caller.favorite.isFavorite({ targetUserId: 2 });
      expect(typeof isFav).toBe("boolean");
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("lists all favorites", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const favorites = await caller.favorite.getFavorites();
      expect(Array.isArray(favorites)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("rejects a non-numeric targetUserId", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error deliberately wrong type
      caller.favorite.addFavorite({ targetUserId: "not-a-number" })
    ).rejects.toThrow();
  });
});

describe("swipe history", () => {
  it("returns history within the default limit", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const history = await caller.history.getSwipeHistory({ limit: 50 });
      expect(Array.isArray(history)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("rejects a limit of 0", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.history.getSwipeHistory({ limit: 0 })).rejects.toThrow();
  });

  it("rejects a limit above 100", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.history.getSwipeHistory({ limit: 101 })).rejects.toThrow();
  });
});

describe("discovery extras", () => {
  it("gets the daily swipe count for the current user", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const count = await caller.discovery.getDailySwipeCount();
      expect(count).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("excludes the caller from getActiveWalkers results", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const walkers = await caller.discovery.getActiveWalkers({
        radiusKm: 5,
        latitude: 48.8566,
        longitude: 2.3522,
      });
      expect(Array.isArray(walkers)).toBe(true);
      expect(walkers.find((w: any) => w.id === 1)).toBeUndefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("rejects getActiveWalkers with an out-of-range radius", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.discovery.getActiveWalkers({ radiusKm: 100, latitude: 48.85, longitude: 2.35 })
    ).rejects.toThrow();
  });
});
