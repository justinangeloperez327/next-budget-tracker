import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaPg } from "@prisma/adapter-pg";
const globalDb = globalThis as unknown as { budgetDb?: PrismaClient };
export function db(): PrismaClient {
  if (!process.env.DATABASE_URL) throw new Error("Database unavailable");
  if (!globalDb.budgetDb) {
    if (/^prisma(?:\+postgres)?:\/\//.test(process.env.DATABASE_URL)) {
      globalDb.budgetDb = new PrismaClient({
        accelerateUrl: process.env.DATABASE_URL,
      }).$extends(withAccelerate()) as unknown as PrismaClient;
    } else
      globalDb.budgetDb = new PrismaClient({
        adapter: new PrismaPg({
          connectionString: process.env.DATABASE_URL,
          max: 3,
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 10000,
        }),
      });
  }
  return globalDb.budgetDb;
}
