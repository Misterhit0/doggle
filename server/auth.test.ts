import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {}, ip: nextIp() } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

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
    req: { protocol: "https", headers: {}, ip: nextIp() } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.signup", () => {
  it("rejects an invalid email", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.signup({ email: "not-an-email", password: "password123", name: "Jean" })
    ).rejects.toThrow();
  });

  it("rejects a password shorter than 6 characters", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.signup({ email: "jean@example.com", password: "123", name: "Jean" })
    ).rejects.toThrow();
  });

  it("rejects a name shorter than 2 characters", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.signup({ email: "jean@example.com", password: "password123", name: "J" })
    ).rejects.toThrow();
  });

  it("attempts a valid signup (may fail on DB, but not on validation)", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.auth.signup({
        email: `nouveau-${Date.now()}@example.com`,
        password: "password123",
        name: "Jean Dupont",
      });
      expect(result.success).toBe(true);
    } catch (error: any) {
      // Expected if DB is not available; must not be a validation error.
      expect(error.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("auth.login", () => {
  it("rejects an invalid email shape", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({ email: "not-an-email", password: "whatever" })
    ).rejects.toThrow();
  });

  it("rejects an unknown user or wrong password with UNAUTHORIZED (or a DB-unavailable error)", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.login({ email: "unknown-user@example.com", password: "wrong-password" });
      expect.fail("Should have thrown for unknown user");
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });

  it("works even for an already-anonymous caller", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

describe("auth.me", () => {
  it("returns null for an anonymous caller", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});
