import "server-only";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

export const dbPool = globalForDb.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = dbPool;
}
