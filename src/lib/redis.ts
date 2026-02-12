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

export async function getJsonCache<T>(key: string): Promise<T | null> {
  try {
    await ensureRedisConnection();
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("Redis get cache failed", { key, error });
    return null;
  }
}

export async function setJsonCache(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  try {
    await ensureRedisConnection();
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error("Redis set cache failed", { key, error });
  }
}

export async function deleteCacheKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await ensureRedisConnection();
    await redisClient.del(keys);
  } catch (error) {
    console.error("Redis delete cache keys failed", { keys, error });
  }
}

export async function deleteCacheByPattern(pattern: string): Promise<void> {
  try {
    await ensureRedisConnection();
    const foundKeys = await redisClient.keys(pattern);
    if (foundKeys.length > 0) {
      await redisClient.del(foundKeys);
    }
  } catch (error) {
    console.error("Redis delete cache pattern failed", { pattern, error });
  }
}
