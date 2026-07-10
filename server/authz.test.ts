import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides: Partial<AuthenticatedUser> = {}): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "user-1",
    email: "user1@example.com",
    name: "User 1",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return { ctx };
}

describe("authorization boundaries", () => {
  describe("protectedProcedure rejects anonymous callers", () => {
    const cases: Array<[string, (caller: ReturnType<typeof appRouter.createCaller>) => Promise<unknown>]> = [
      ["user.getProfile", c => c.user.getProfile()],
      ["dog.getMyDogs", c => c.dog.getMyDogs()],
      ["discovery.getDailySwipeCount", c => c.discovery.getDailySwipeCount()],
      ["match.getMatches", c => c.match.getMatches()],
      ["notification.getNotifications", c => c.notification.getNotifications()],
      ["favorite.getFavorites", c => c.favorite.getFavorites()],
      ["history.getSwipeHistory", c => c.history.getSwipeHistory({ limit: 10 })],
      ["verification.getVerification", c => c.verification.getVerification()],
    ];

    for (const [name, call] of cases) {
      it(`rejects ${name} without a session`, async () => {
        const { ctx } = createUnauthContext();
        const caller = appRouter.createCaller(ctx);

        await expect(call(caller)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      });
    }
  });

  describe("admin-gated verification procedures", () => {
    it("rejects approveVerification for a non-admin user", async () => {
      const { ctx } = createAuthContext({ role: "user" });
      const caller = appRouter.createCaller(ctx);

      await expect(caller.verification.approveVerification({ userId: 2 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("rejects rejectVerification for a non-admin user", async () => {
      const { ctx } = createAuthContext({ role: "user" });
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.verification.rejectVerification({ userId: 2, reason: "Photo unclear" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("allows an admin to attempt approveVerification (may fail on DB, not FORBIDDEN)", async () => {
      const { ctx } = createAuthContext({ role: "admin" });
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.verification.approveVerification({ userId: 2 });
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.code).not.toBe("FORBIDDEN");
      }
    });
  });

  describe("self-referential guards (no DB required)", () => {
    it("rejects favoriting yourself", async () => {
      const { ctx } = createAuthContext({ id: 7 });
      const caller = appRouter.createCaller(ctx);

      await expect(caller.favorite.addFavorite({ targetUserId: 7 })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });
});
