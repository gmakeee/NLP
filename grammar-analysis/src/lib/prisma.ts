import { PrismaClient } from "@prisma/client";

// ─── Environment Validation ───────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  throw new Error(
    "[Prisma] Missing environment variable: DATABASE_URL\n" +
      "Set it in .env.local (or your deployment environment)."
  );
}

if (!process.env.DIRECT_URL) {
  throw new Error(
    "[Prisma] Missing environment variable: DIRECT_URL\n" +
      "Supabase requires DIRECT_URL for migrations.\n" +
      "Set it in .env.local (or your deployment environment)."
  );
}

// ─── Singleton Pattern ────────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
}

const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export default prisma;
