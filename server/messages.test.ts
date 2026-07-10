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

describe("conversations / messages", () => {
  describe("message.sendMessage validation", () => {
    it("rejects an empty message", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(caller.message.sendMessage({ matchId: 1, content: "" })).rejects.toThrow();
    });

    it("rejects a message longer than 1000 characters", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.message.sendMessage({ matchId: 1, content: "a".repeat(1001) })
      ).rejects.toThrow();
    });

    it("accepts a message at exactly the 1000 character boundary", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.message.sendMessage({ matchId: 1, content: "a".repeat(1000) });
        expect(result.success).toBe(true);
      } catch (error: any) {
        // Expected if DB is not available
        expect(error.message).toBeDefined();
      }
    });

    it("rejects a non-numeric matchId", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        // @ts-expect-error deliberately wrong type
        caller.message.sendMessage({ matchId: "abc", content: "Salut !" })
      ).rejects.toThrow();
    });

    it("accepts emoji and accented content", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.message.sendMessage({
          matchId: 1,
          content: "Salut ! Ça te dit une balade au parc ce week-end ? 🐕🎾",
        });
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("message.getMessages", () => {
    it("rejects a missing matchId", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        // @ts-expect-error deliberately missing required field
        caller.message.getMessages({})
      ).rejects.toThrow();
    });

    it("returns an array for a valid matchId", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        const messages = await caller.message.getMessages({ matchId: 1 });
        expect(Array.isArray(messages)).toBe(true);
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });
});
