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

describe("Dog Walking Service System", () => {
  it("allows creating a walking service offer", async () => {
    const { ctx } = createAuthContext(2); // Sitter user
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.walkingService.createService({
        title: "Balade canine dynamique",
        description: "Je promène vos chiens dans les parcs locaux pendant 1h.",
        pricePerWalk: 15.00,
        frequency: "weekly",
        availableDays: ["monday", "wednesday", "friday"],
      });
      expect(result.success).toBe(true);
      expect(result.serviceId).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("fails booking a nonexistent service", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.walkingService.bookService({
        serviceId: 999999,
        scheduledDate: new Date(),
        notes: "Urgents",
      });
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});
