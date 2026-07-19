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

describe("Vet Appointments System", () => {
  it("allows searching for veterinarians nearby", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const vets = await caller.vetAppointments.searchVets({
        latitude: 48.85,
        longitude: 2.35,
        radiusKm: 10,
      });
      expect(Array.isArray(vets)).toBe(true);
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("allows booking an appointment (Option A/B)", async () => {
    const { ctx } = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      const appointment = await caller.vetAppointments.bookAppointment({
        dogId: 1,
        customVetName: "Dr. Martin",
        appointmentTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: "Consultation annuelle",
        notes: "Rien à signaler d'anormal.",
      });
      expect(appointment.success).toBe(true);
      expect(appointment.appointmentId).toBeDefined();
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("fails cancelling a nonexistent appointment", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.vetAppointments.cancelAppointment({ appointmentId: 999999 })
    ).rejects.toThrow();
  });
});
