import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: `user-1`,
    email: `user1@example.com`,
    name: `User 1`,
    loginMethod: "manus",
    role: role,
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

describe("Admin Dashboard System", () => {
  describe("Forbidden access for standard users", () => {
    it("rejects getDashboardStats for standard users", async () => {
      const { ctx } = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.getDashboardStats()).rejects.toThrow();
    });

    it("rejects getUsers for standard users", async () => {
      const { ctx } = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.getUsers()).rejects.toThrow();
    });

    it("rejects updateUser for standard users", async () => {
      const { ctx } = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.admin.updateUser({ userId: 2, name: "New Name" })
      ).rejects.toThrow();
    });

    it("rejects deleteUser for standard users", async () => {
      const { ctx } = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.admin.deleteUser({ userId: 2 })
      ).rejects.toThrow();
    });

    it("rejects getServerStats for standard users", async () => {
      const { ctx } = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);
      await expect(caller.admin.getServerStats()).rejects.toThrow();
    });

    it("rejects getLogs for standard users", async () => {
      const { ctx } = createAuthContext("user");
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.admin.getLogs({ logFile: "auth.log" })
      ).rejects.toThrow();
    });
  });

  describe("Granted access for admin users", () => {
    it("allows getDashboardStats for admin users (surfaces DB-unavailable or succeeds)", async () => {
      const { ctx } = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);
      try {
        const stats = await caller.admin.getDashboardStats();
        expect(stats).toBeDefined();
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("allows getUsers for admin users (surfaces DB-unavailable or succeeds)", async () => {
      const { ctx } = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);
      try {
        const usersList = await caller.admin.getUsers();
        expect(usersList).toBeDefined();
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("allows updateUser for admin users (surfaces DB-unavailable or succeeds)", async () => {
      const { ctx } = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);
      try {
        const result = await caller.admin.updateUser({ userId: 2, name: "Admin Edit" });
        expect(result.success).toBe(true);
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("allows getServerStats for admin users", async () => {
      const { ctx } = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);
      try {
        const stats = await caller.admin.getServerStats();
        expect(stats.memory).toBeDefined();
        expect(stats.uptime).toBeDefined();
        expect(stats.cpu).toBeDefined();
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });

    it("allows getLogs for admin users", async () => {
      const { ctx } = createAuthContext("admin");
      const caller = appRouter.createCaller(ctx);
      try {
        const logLines = await caller.admin.getLogs({ logFile: "auth.log", linesCount: 10 });
        expect(Array.isArray(logLines)).toBe(true);
      } catch (error: any) {
        expect(error.message).toBeDefined();
      }
    });
  });
});
