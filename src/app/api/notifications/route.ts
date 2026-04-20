import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { dbPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/notifications?unread=1&limit=20 — list current user's notifications */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 100);

    const where = unreadOnly ? "AND read_at IS NULL" : "";
    const r = await dbPool.query(
      `
      SELECT id, event_type, title, body, link, meta, read_at, created_at
      FROM notification
      WHERE user_id = $1 ${where}
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [session.userId, limit],
    );

    const unreadCount = await dbPool.query<{ n: number }>(
      `SELECT COUNT(*)::int n FROM notification WHERE user_id=$1 AND read_at IS NULL`,
      [session.userId],
    );

    return NextResponse.json({
      notifications: r.rows,
      unread: unreadCount.rows[0].n,
    });
  } catch (err) {
    const code =
      err instanceof Error && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: code },
    );
  }
}

/** POST /api/notifications  body { ids: string[] | "all" } — mark read */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = (await req.json().catch(() => ({}))) as {
      ids?: string[] | "all";
    };

    if (body.ids === "all") {
      await dbPool.query(
        `UPDATE notification SET read_at=now() WHERE user_id=$1 AND read_at IS NULL`,
        [session.userId],
      );
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await dbPool.query(
        `UPDATE notification SET read_at=now() WHERE user_id=$1 AND id = ANY($2::uuid[])`,
        [session.userId, body.ids],
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code =
      err instanceof Error && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "error" },
      { status: code },
    );
  }
}
