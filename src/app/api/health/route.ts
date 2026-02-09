import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { ensureRedisConnection, redisClient } from "@/lib/redis";

export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  let redisOk = false;

  try {
    await dbPool.query("select 1 as ok");
    dbOk = true;
  } catch (error) {
    console.error("Database health check failed", error);
  }

  try {
    await ensureRedisConnection();
    const pong = await redisClient.ping();
    redisOk = pong === "PONG";
  } catch (error) {
    console.error("Redis health check failed", error);
  }

  return NextResponse.json({
    ok: dbOk && redisOk,
    db: dbOk,
    redis: redisOk,
    durationMs: Date.now() - startedAt,
  });
}
