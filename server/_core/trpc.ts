import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

function getClientIp(ctx: TrpcContext): string {
  return ctx.req.ip || (ctx.req.headers["x-forwarded-for"] as string) || ctx.req.socket?.remoteAddress || "unknown";
}

// Per-IP rate limiter factory. Implemented as tRPC middleware (instead of raw
// Express middleware) so a 429 always goes through tRPC's own error
// serialization — the httpBatchLink + superjson client can only deserialize
// responses shaped by tRPC itself, not arbitrary JSON, and previously crashed
// with "Unable to transform response from server" whenever a raw Express 429 fired.
function createRateLimit(limit: number, windowMs: number) {
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  return t.middleware(async opts => {
    const ip = getClientIp(opts.ctx);
    const now = Date.now();
    let record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(ip, record);
    } else {
      record.count++;
    }

    if (record.count > limit) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests. Please try again later." });
    }

    return opts.next();
  });
}

// Global per-IP limit applied to every procedure (mirrors the previous
// Express-level "/api" limiter of 200 requests / 15 min).
const baseProcedure = t.procedure.use(createRateLimit(200, 15 * 60 * 1000));

export const publicProcedure = baseProcedure;

// Tighter per-IP limit for login/signup (mirrors the previous
// Express-level "/api/trpc/auth.*" limiter of 5 requests / min).
export const authRateLimitedProcedure = baseProcedure.use(createRateLimit(5, 60 * 1000));

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(requireUser);

export const adminProcedure = baseProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
