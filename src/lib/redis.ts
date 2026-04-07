import "server-only";
import { createClient } from "redis";

const globalForRedis = globalThis as unknown as {
  redisClient?: ReturnType<typeof createClient> | null;
  redisConnecting?: boolean;
  redisLastError?: number;
};

function createRedisClient() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn("REDIS_URL is not set — Redis caching disabled");
    return null;
  }

  const client = createClient({
    url,
    socket: {
      connectTimeout: 5_000,
      reconnectStrategy: (retries) => {
        // After 3 retries, back off exponentially up to 30s
        if (retries > 10) return new Error("Redis max retries reached");
        return Math.min(retries * 1000, 30_000);
      },
    },
  });

  client.on("error", (err) => {
    // Only log every 60s to avoid spam
    const now = Date.now();
    if (!globalForRedis.redisLastError || now - globalForRedis.redisLastError > 60_000) {
      console.error("Redis Client Error:", err.message);
      globalForRedis.redisLastError = now;
    }
  });

  return client;
}

export const redisClient = globalForRedis.redisClient ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redisClient;
}

/**
 * Connect to Redis with a timeout. Never blocks longer than 5s.
 * Returns false if connection failed (callers should skip caching).
 */
export async function ensureRedisConnection(): Promise<boolean> {
  if (!redisClient) return false;
  if (redisClient.isOpen) return true;
  if (globalForRedis.redisConnecting) return false;

  globalForRedis.redisConnecting = true;
  try {
    await Promise.race([
      redisClient.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Redis connect timeout")), 5_000)
      ),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    globalForRedis.redisConnecting = false;
  }
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  try {
    const ok = await ensureRedisConnection();
    if (!ok || !redisClient) return null;
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJsonCache(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  try {
    const ok = await ensureRedisConnection();
    if (!ok || !redisClient) return;
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Silently fail — caching is optional
  }
}

export async function deleteCacheKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const ok = await ensureRedisConnection();
    if (!ok || !redisClient) return;
    await redisClient.del(keys);
  } catch {
    // Silently fail
  }
}

export async function deleteCacheByPattern(pattern: string): Promise<void> {
  try {
    const ok = await ensureRedisConnection();
    if (!ok || !redisClient) return;
    const foundKeys = await redisClient.keys(pattern);
    if (foundKeys.length > 0) {
      await redisClient.del(foundKeys);
    }
  } catch {
    // Silently fail
  }
}
