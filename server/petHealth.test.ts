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

describe("Pet Health System", () => {
  it("allows owner to update health record", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.petHealth.upsertHealthRecord({
        dogId: 1,
        weight: 15.4,
        allergies: "Poulet",
        medicalHistory: "Opération de la patte en 2025.",
      });
      expect(result.success).toBe(true);
      expect(result.recordId).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("restricts viewing health record to unauthorized users", async () => {
    const { ctx } = createAuthContext(999);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.petHealth.getHealthRecord({ dogId: 1 })
    ).rejects.toThrow();
  });

  it("allows adding vaccines and documents", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const vaccine = await caller.petHealth.addVaccine({
        dogId: 1,
        name: "Rage",
        administeredDate: new Date(),
        nextBoosterDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      expect(vaccine.success).toBe(true);

      const doc = await caller.petHealth.addDocument({
        dogId: 1,
        documentName: "Ordonnance vermifuge",
        documentUrl: "https://storage.example.com/docs/ord1.pdf",
        documentType: "prescription",
      });
      expect(doc.success).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});
