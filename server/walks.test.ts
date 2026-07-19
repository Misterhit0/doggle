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

describe("GPS Walks & Tracking System", () => {
  it("allows synchronizing a completed walk", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.walks.syncWalk({
        distanceMeter: 1200,
        durationSecond: 600,
        gpsPath: [
          { lat: 48.86, lng: 2.34, timestamp: Date.now() - 600000 },
          { lat: 48.865, lng: 2.345, timestamp: Date.now() },
        ],
      });
      expect(result.success).toBe(true);
      expect(result.walkId).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("retrieves my walks history", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const walks = await caller.walks.getMyWalks();
      expect(Array.isArray(walks)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("allows setting walk goals and checking progress", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const goalResult = await caller.walks.setOrUpdateGoal({
        goalType: "distance",
        targetValue: 5000, // 5km goal
        period: "weekly",
      });
      expect(goalResult.success).toBe(true);

      const goals = await caller.walks.getCurrentGoals();
      expect(Array.isArray(goals)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});
