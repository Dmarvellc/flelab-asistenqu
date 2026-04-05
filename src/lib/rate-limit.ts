import "server-only";

import { createHash } from "crypto";
import { ensureRedisConnection, redisClient } from "@/lib/redis";

type RateLimitOptions = {
  namespace: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function buildRateLimitKey(namespace: string, identifier: string) {
  const digest = createHash("sha256").update(identifier).digest("hex");
  return `ratelimit:${namespace}:${digest}`;
}

export async function consumeRateLimit({
  namespace,
  identifier,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  const key = buildRateLimitKey(namespace, identifier);

  try {
    await ensureRedisConnection();
    const current = await redisClient.incr(key);
    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    const ttl = await redisClient.ttl(key);
    return {
      allowed: current <= limit,
      remaining: Math.max(limit - current, 0),
      retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  } catch (error) {
    console.error("Rate limit failed open", { namespace, error });
    return {
      allowed: true,
      remaining: limit,
      retryAfterSeconds: 0,
    };
  }
}
