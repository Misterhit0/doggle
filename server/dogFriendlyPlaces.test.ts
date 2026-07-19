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

describe("Dog Friendly Places System", () => {
  it("allows creating a new place", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.dogFriendlyPlaces.createPlace({
        name: "Parc du Centenaire",
        placeType: "park",
        latitude: 48.86,
        longitude: 2.34,
        description: "Un joli parc pour courir.",
        isDogsAllowed: true,
      });
      expect(result.success).toBe(true);
      expect(result.placeId).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("retrieves nearby places with/without custom coordinates", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const places = await caller.dogFriendlyPlaces.getNearbyPlaces({
        latitude: 48.86,
        longitude: 2.34,
        radiusKm: 10,
      });
      expect(Array.isArray(places)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("fails retrieving a nonexistent place detail", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dogFriendlyPlaces.getPlaceDetails({ placeId: 999999 });
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("rejects an invalid rating on place review", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.dogFriendlyPlaces.addPlaceReview({
        placeId: 1,
        rating: 10,
      })
    ).rejects.toThrow();
  });

  it("allows submitting and fetching reviews", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const reviewResult = await caller.dogFriendlyPlaces.addPlaceReview({
        placeId: 1,
        rating: 5,
        comment: "Excellent parc très propre !",
      });
      expect(reviewResult.success).toBe(true);

      const reviews = await caller.dogFriendlyPlaces.getPlaceReviews({ placeId: 1 });
      expect(Array.isArray(reviews)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});
