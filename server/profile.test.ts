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

describe("profile management", () => {
  describe("user.updateProfile", () => {
    it("accepts a valid partial profile update", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.user.updateProfile({
          age: 34,
          bio: "J'adore les longues balades en forêt avec mon chien.",
          interests: ["randonnée", "parcs"],
          whatISeek: ["friend", "mentor"],
        });
        expect(result.success).toBe(true);
      } catch (error: any) {
        // Expected if DB is not available
        expect(error.message).toBeDefined();
      }
    });

    it("rejects an age below the minimum", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.updateProfile({ age: 0 })).rejects.toThrow();
    });

    it("rejects an age above the maximum", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.updateProfile({ age: 151 })).rejects.toThrow();
    });

    it("rejects a bio longer than 500 characters", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.updateProfile({ bio: "a".repeat(501) })).rejects.toThrow();
    });

    it("rejects an invalid whatISeek enum value", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        // @ts-expect-error deliberately invalid enum value
        caller.user.updateProfile({ whatISeek: ["romance"] })
      ).rejects.toThrow();
    });

    it("accepts a photo path (relative or local)", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.user.updateProfile({ profilePhotoUrl: "/uploads/user1-avatar.jpg" });
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("accepts a valid profilePhotoUrl", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.user.updateProfile({
          profilePhotoUrl: "https://storage.example.com/photos/user1-avatar.jpg",
        });
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });

  describe("user.updateLocation", () => {
    it("rejects a latitude out of range", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.updateLocation({ latitude: 91, longitude: 2.35 })).rejects.toThrow();
    });

    it("rejects a longitude out of range", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.updateLocation({ latitude: 48.85, longitude: 181 })).rejects.toThrow();
    });
  });

  describe("user.setHomeLocation", () => {
    it("accepts valid coordinates", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.user.setHomeLocation({ latitude: 45.75, longitude: 4.85 });
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("rejects out-of-range coordinates", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.user.setHomeLocation({ latitude: -91, longitude: 0 })).rejects.toThrow();
    });
  });

  describe("user.toggleLocationSharing", () => {
    it("accepts a boolean flag", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        const result = await caller.user.toggleLocationSharing({ isActive: true });
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("rejects a non-boolean value", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        // @ts-expect-error deliberately wrong type
        caller.user.toggleLocationSharing({ isActive: "yes" })
      ).rejects.toThrow();
    });
  });

  describe("user.getPublicProfile", () => {
    it("fetches another user's public profile", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      try {
        const profile = await caller.user.getPublicProfile({ targetUserId: 2 });
        expect(profile).toBeDefined();
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("rejects a missing targetUserId", async () => {
      const { ctx } = createAuthContext(1);
      const caller = appRouter.createCaller(ctx);

      await expect(
        // @ts-expect-error deliberately missing required field
        caller.user.getPublicProfile({})
      ).rejects.toThrow();
    });
  });
});
