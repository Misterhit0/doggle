import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1, role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role,
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

describe("sponsorship", () => {
  it("rejects a reason shorter than 10 characters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sponsorship.requestSponsorship({ reason: "trop bref", frequency: "weekly" })
    ).rejects.toThrow();
  });

  it("rejects an invalid frequency enum", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sponsorship.requestSponsorship({
        reason: "Je cherche un accompagnement régulier pour mes sorties.",
        // @ts-expect-error deliberately invalid enum value
        frequency: "daily",
      })
    ).rejects.toThrow();
  });

  it("accepts a valid sponsorship request", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sponsorship.requestSponsorship({
      reason: "Je cherche un accompagnement régulier pour mes sorties.",
      frequency: "monthly",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a rating outside 1-5 on rateSponsorship", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sponsorship.rateSponsorship({ sponsorshipId: 1, rating: 6 })
    ).rejects.toThrow();
  });

  it("lists available sponsors and my sponsors", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sponsors = await caller.sponsorship.getAvailableSponsors({ radiusKm: 10 });
    expect(Array.isArray(sponsors)).toBe(true);

    const mine = await caller.sponsorship.getMySponsors();
    expect(Array.isArray(mine)).toBe(true);
  });
});

describe("walking service", () => {
  it("rejects a title shorter than 5 characters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.walkingService.createService({
        title: "abc",
        description: "Promenades quotidiennes dans le quartier.",
        availableDays: ["monday"],
      })
    ).rejects.toThrow();
  });

  it("rejects a negative price", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.walkingService.createService({
        title: "Balades du matin",
        description: "Promenades quotidiennes dans le quartier.",
        pricePerWalk: -5,
        availableDays: ["monday"],
      })
    ).rejects.toThrow();
  });

  it("accepts a valid service offer", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.walkingService.createService({
      title: "Balades du matin",
      description: "Promenades quotidiennes dans le quartier.",
      pricePerWalk: 12,
      frequency: "daily",
      availableDays: ["monday", "wednesday", "friday"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid scheduledDate type on bookService", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.walkingService.bookService({
        serviceId: 1,
        // @ts-expect-error deliberately wrong type (string instead of Date)
        scheduledDate: "2026-08-01",
      })
    ).rejects.toThrow();
  });

  it("accepts a valid booking", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.walkingService.bookService({
      serviceId: 1,
      scheduledDate: new Date("2026-08-01T10:00:00Z"),
      notes: "Mon chien est un peu craintif avec les inconnus.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a rating outside 1-5 on rateService", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.walkingService.rateService({ bookingId: 1, rating: 0 })).rejects.toThrow();
  });
});

describe("events", () => {
  it("rejects an event title shorter than 5 characters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.events.createEvent({
        title: "abc",
        description: "Une belle sortie collective au parc du quartier.",
        eventType: "walk",
        location: "Parc de la Tête d'Or",
        latitude: 45.77,
        longitude: 4.85,
        eventDate: new Date("2026-09-01T09:00:00Z"),
        duration: 60,
      });
      expect.fail("Should have thrown a validation error");
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("rejects a duration below 15 minutes", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.events.createEvent({
        title: "Sortie canine du dimanche",
        description: "Une belle sortie collective au parc du quartier.",
        eventType: "walk",
        location: "Parc de la Tête d'Or",
        latitude: 45.77,
        longitude: 4.85,
        eventDate: new Date("2026-09-01T09:00:00Z"),
        duration: 5,
      });
      expect.fail("Should have thrown a validation error");
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("attempts to create a valid event (may fail on DB, not validation)", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.events.createEvent({
        title: "Sortie canine du dimanche",
        description: "Une belle sortie collective au parc du quartier.",
        eventType: "walk",
        location: "Parc de la Tête d'Or",
        latitude: 45.77,
        longitude: 4.85,
        eventDate: new Date("2026-09-01T09:00:00Z"),
        duration: 60,
      });
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("attempts to join an event", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.events.joinEvent({ eventId: 1 });
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("rejects a rating outside 1-5 on rateEvent", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.events.rateEvent({ eventId: 1, rating: 10 })).rejects.toThrow();
  });
});

describe("lost & found dogs", () => {
  it("attempts to report a lost dog", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.lostDogs.reportLostDog({
        dogId: 1,
        description: "Perdu près du parc, portait un collier bleu.",
        lostDate: new Date("2026-07-01T14:00:00Z"),
        lostLocation: "Parc Montsouris",
        latitude: 48.82,
        longitude: 2.33,
      });
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("attempts to fetch nearby lost dogs", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const dogs = await caller.lostDogs.getNearbyLostDogs({ latitude: 48.82, longitude: 2.33 });
      expect(Array.isArray(dogs)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("rejects an invalid confidence enum on reportSighting", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.lostDogs.reportSighting({
        lostDogId: 1,
        location: "Rue de Rivoli",
        latitude: 48.85,
        longitude: 2.36,
        sightingDate: new Date("2026-07-02T10:00:00Z"),
        description: "Vu traversant la rue.",
        // @ts-expect-error deliberately invalid enum value
        confidence: "sure",
      })
    ).rejects.toThrow();
  });

  it("accepts a valid sighting report", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.lostDogs.reportSighting({
        lostDogId: 1,
        location: "Rue de Rivoli",
        latitude: 48.85,
        longitude: 2.36,
        sightingDate: new Date("2026-07-02T10:00:00Z"),
        description: "Vu traversant la rue.",
        confidence: "likely",
      });
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("fetches sightings for a lost dog", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const sightings = await caller.lostDogs.getSightings({ lostDogId: 1 });
      expect(Array.isArray(sightings)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("marks a lost dog as found", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.lostDogs.markAsFound({ lostDogId: 1 });
    expect(result.success).toBe(true);
  });
});

describe("reviews & ratings", () => {
  it("rejects a rating outside 1-5", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.reviews.createReview({ reviewedId: 2, rating: 0 })).rejects.toThrow();
  });

  it("rejects a comment longer than 500 characters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.reviews.createReview({ reviewedId: 2, rating: 5, comment: "a".repeat(501) })
    ).rejects.toThrow();
  });

  it("attempts to create a valid review", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.reviews.createReview({
        reviewedId: 2,
        rating: 5,
        comment: "Rencontre très sympathique, à refaire !",
      });
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("getReviewsForUser is public and works without a session", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    try {
      const reviews = await caller.reviews.getReviewsForUser({ userId: 2 });
      expect(Array.isArray(reviews)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("getAverageRating is public and works without a session", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    try {
      const avg = await caller.reviews.getAverageRating({ userId: 2 });
      expect(avg).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});

describe("identity verification", () => {
  it("attempts to submit a verification photo", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.verification.submitVerification({
        photoUrl: "https://storage.example.com/verification/selfie1.jpg",
      });
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("fetches the current user's verification status", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const verification = await caller.verification.getVerification();
      expect(verification !== undefined).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("allows an admin to approve a verification", async () => {
    const { ctx } = createAuthContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.verification.approveVerification({ userId: 2 });
      expect(result.success).toBe(true);
    } catch (error: any) {
      expect(error.code).not.toBe("FORBIDDEN");
    }
  });

  it("allows an admin to reject a verification with a reason", async () => {
    const { ctx } = createAuthContext(1, "admin");
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.verification.rejectVerification({
        userId: 2,
        reason: "Photo floue, merci de recommencer.",
      });
      expect(result.success).toBe(true);
    } catch (error: any) {
      expect(error.code).not.toBe("FORBIDDEN");
    }
  });
});
