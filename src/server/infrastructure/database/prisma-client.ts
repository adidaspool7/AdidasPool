/**
 * Prisma Client Singleton
 *
 * ONION LAYER: Infrastructure
 * DEPENDENCIES: @prisma/client (external)
 *
 * Provides a single Prisma client instance across the application.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
