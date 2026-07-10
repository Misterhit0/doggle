import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUnauthContext(ip: string): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      ip,
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth rate limiting", () => {
  it("throws a TOO_MANY_REQUESTS TRPCError (not a raw response) once the login limit is exceeded", async () => {
    const { ctx } = createUnauthContext("203.0.113.10");
    const caller = appRouter.createCaller(ctx);
    const input = { email: "ratelimit-test@example.com", password: "wrong-password" };

    let tooManyRequestsSeen = false;

    // Auth rate limit is 5 requests/minute per IP; the 6th call must be rejected
    // by tRPC itself (TOO_MANY_REQUESTS) rather than crash client-side parsing.
    for (let i = 0; i < 6; i++) {
      try {
        await caller.auth.login(input);
      } catch (error: any) {
        if (error.code === "TOO_MANY_REQUESTS") {
          tooManyRequestsSeen = true;
        }
        // Other attempts fail with invalid credentials / DB unavailable, which is expected.
        expect(error.message).toBeDefined();
      }
    }

    expect(tooManyRequestsSeen).toBe(true);
  });
});
