import "server-only";
import { createClient } from "redis";

const globalForRedis = globalThis as unknown as {
  redisClient?: ReturnType<typeof createClient>;
};

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set");
  }

  const client = createClient({ url });
  client.on("error", (err) => {
    console.error("Redis Client Error", err);
  });
  return client;
}

export const redisClient = globalForRedis.redisClient ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redisClient;
}

export async function ensureRedisConnection() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}
