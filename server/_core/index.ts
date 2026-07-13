import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { healStuckMatches } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable trust proxy so Express parses X-Forwarded-For headers from Nginx proxy
  app.set("trust proxy", true);

  // Validate JWT Secret strength in production
  if (process.env.NODE_ENV === "production") {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim().length < 32) {
      console.error("❌ CRITICAL ERROR: JWT_SECRET is empty or too short (must be at least 32 characters in production)!");
      process.exit(1);
    }
  }

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Custom HTTP Security Headers
  app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com https://nominatim.openstreetmap.org;"
    );
    next();
  });

  // Custom CORS Configuration
  app.use((req, res, next) => {
    const allowedOrigins = [
      "https://doggle.cloud",
      "https://preprod.doggle.cloud",
      "https://newpreprod.doggle.cloud",
      "https://newpreprod.woofyz.com",
      "http://187.55.227.99:3002",
      "http://localhost:3000",
      "http://localhost:3001"
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,PATCH,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Custom Rate Limiting Middlewares
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  function createRateLimiter(limit: number, windowMs: number) {
    return (req: any, res: any, next: any) => {
      const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      let record = rateLimitMap.get(ip);

      if (!record || now > record.resetTime) {
        record = { count: 1, resetTime: now + windowMs };
        rateLimitMap.set(ip, record);
      } else {
        record.count++;
      }

      if (record.count > limit) {
        res.setHeader("Retry-After", Math.ceil((record.resetTime - now) / 1000));
        return res.status(429).json({
          error: {
            message: "Too many requests. Please try again later.",
          }
        });
      }
      next();
    };
  }

  // All /api/trpc/* traffic is rate-limited inside tRPC itself (see server/_core/trpc.ts:
  // baseProcedure and authRateLimitedProcedure) so a 429 is always serialized by tRPC.
  // Raw Express JSON responses can't be deserialized by the httpBatchLink + superjson
  // client and previously caused "Unable to transform response from server" whenever
  // this limiter fired for a tRPC route — so it's now scoped to non-tRPC /api routes only.
  app.use("/api/oauth", createRateLimiter(200, 15 * 60 * 1000));

  registerStorageProxy(app);
  app.use("/uploads", express.static(path.resolve(import.meta.dirname, "../..", "uploads")));
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    healStuckMatches().catch(err => console.error("[Database] Self-healing failed:", err));
  });
}

startServer().catch(console.error);
