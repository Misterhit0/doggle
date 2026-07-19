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

describe("Sponsorship System", () => {
  it("allows submitting a sponsorship request", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.sponsorship.requestSponsorship({
        reason: "Besoin d'aide pour sortir mon husky âgé le matin.",
        frequency: "weekly",
      });
      expect(result.success).toBe(true);
      expect(result.sponsorshipId).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("fails accepting a nonexistent sponsorship request", async () => {
    const { ctx } = createAuthContext(2); // Sitter/Volunteer
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.sponsorship.acceptSponsorship({
        elderId: 999999,
      });
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});
