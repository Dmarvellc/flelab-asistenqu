import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Drain pending WhatsApp messages from `whatsapp_outbox`.
 * Designed to be hit by Vercel Cron every minute.
 *
 * Gated by either:
 *   - Vercel Cron header `x-vercel-cron`, OR
 *   - explicit `?token=` matching env CRON_SECRET
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const tokenOk =
    !!process.env.CRON_SECRET &&
    url.searchParams.get("token") === process.env.CRON_SECRET;
  if (!isVercelCron && !tokenOk) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Pop up to 25 pending rows. Mark as 'sent' or 'failed' per result.
  const r = await dbPool.query<{ id: string; to_phone: string; body: string }>(
    `SELECT id, to_phone, body
     FROM whatsapp_outbox
     WHERE status='pending' AND attempts < 5
     ORDER BY created_at
     LIMIT 25`,
  );

  let sent = 0;
  let failed = 0;
  for (const row of r.rows) {
    const result = await sendWhatsAppMessage({ to: row.to_phone, message: row.body });
    if (result.success) {
      await dbPool.query(
        `UPDATE whatsapp_outbox SET status='sent', sent_at=now(), attempts=attempts+1 WHERE id=$1`,
        [row.id],
      );
      sent++;
    } else {
      await dbPool.query(
        `UPDATE whatsapp_outbox
         SET status = CASE WHEN attempts+1 >= 5 THEN 'failed'::notif_delivery_status ELSE 'pending'::notif_delivery_status END,
             attempts = attempts+1,
             error = $2
         WHERE id=$1`,
        [row.id, JSON.stringify(result.error).slice(0, 500)],
      );
      failed++;
    }
  }

  return NextResponse.json({ processed: r.rows.length, sent, failed });
}
