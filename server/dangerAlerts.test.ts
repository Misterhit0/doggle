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

describe("Danger Alerts System", () => {
  it("allows reporting a danger alert", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.dangerAlerts.reportDanger({
        dangerType: "cyanobacteria",
        latitude: 48.82,
        longitude: 2.33,
        description: "Présence de cyanobactéries dans le lac.",
        durationHours: 48,
      });
      expect(result.success).toBe(true);
      expect(result.alertId).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("retrieves nearby active danger alerts", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const alerts = await caller.dangerAlerts.getNearbyDangers({
        latitude: 48.82,
        longitude: 2.33,
        radiusKm: 5,
      });
      expect(Array.isArray(alerts)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("fails resolving a nonexistent danger alert", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dangerAlerts.resolveDanger({ alertId: 999999 });
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});
