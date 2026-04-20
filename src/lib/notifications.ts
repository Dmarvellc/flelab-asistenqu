import "server-only";
import { dbPool } from "./db";

/**
 * Notification engine.
 *
 * Single entry point: `notify(...)` writes a row in `notification`, then
 * fans out to delivery channels based on per-user preference (defaults:
 * in_app=true, whatsapp=false). WhatsApp goes through `whatsapp_outbox` so
 * a worker/cron can drain it without blocking the request thread.
 */

export type NotifEventType =
  | "client_request.created"
  | "client_request.approved"
  | "client_request.rejected"
  | "client_request.message"
  | "claim.submitted"
  | "claim.info_requested"
  | "claim.approved"
  | "claim.rejected"
  | "system.alert";

export interface NotifyInput {
  userId: string;
  event: NotifEventType;
  title: string;
  body?: string;
  link?: string;
  meta?: Record<string, unknown>;
}

/**
 * Returns { in_app, whatsapp } for a given (user, event), filling in defaults
 * when no row exists in notification_pref.
 */
async function getChannels(userId: string, event: NotifEventType) {
  const r = await dbPool.query<{ in_app: boolean; whatsapp: boolean }>(
    `SELECT in_app, whatsapp FROM notification_pref WHERE user_id=$1 AND event_type=$2`,
    [userId, event],
  );
  if (r.rows.length === 0) {
    return { in_app: true, whatsapp: false };
  }
  return r.rows[0];
}

/**
 * Look up a user's WhatsApp number from app_user / person link, if any.
 * Returns null if not set so we silently skip WhatsApp delivery.
 */
async function getUserPhone(userId: string): Promise<string | null> {
  const r = await dbPool.query<{ phone: string | null }>(
    `
    SELECT COALESCE(p.phone, '') AS phone
    FROM app_user u
    LEFT JOIN user_person_link l ON l.user_id = u.user_id
    LEFT JOIN person p           ON p.person_id = l.person_id
    WHERE u.user_id = $1
    LIMIT 1
    `,
    [userId],
  );
  const phone = r.rows[0]?.phone?.trim();
  return phone ? phone : null;
}

/**
 * Create a notification + queue deliveries. Best-effort: errors on the
 * WhatsApp/delivery side are logged but do not throw — we never want a
 * notify() call to break the parent business operation.
 */
export async function notify(input: NotifyInput): Promise<{ id: string }> {
  const c = await dbPool.connect();
  try {
    await c.query("BEGIN");

    const r = await c.query<{ id: string }>(
      `
      INSERT INTO notification (user_id, event_type, title, body, link, meta)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      RETURNING id
      `,
      [
        input.userId,
        input.event,
        input.title,
        input.body ?? null,
        input.link ?? null,
        JSON.stringify(input.meta ?? {}),
      ],
    );
    const notificationId = r.rows[0].id;

    const channels = await getChannels(input.userId, input.event);

    // in_app delivery is implicit (the notification row IS the in-app surface),
    // but we still log it so /api/notifications can show channel mix.
    if (channels.in_app) {
      await c.query(
        `INSERT INTO notification_delivery (notification_id, channel, status, sent_at)
         VALUES ($1, 'in_app', 'sent', now())`,
        [notificationId],
      );
    }

    if (channels.whatsapp) {
      const phone = await getUserPhone(input.userId);
      if (phone) {
        const body = input.body ? `*${input.title}*\n${input.body}` : input.title;
        await c.query(
          `INSERT INTO whatsapp_outbox (notification_id, to_phone, body)
           VALUES ($1, $2, $3)`,
          [notificationId, phone, body],
        );
        await c.query(
          `INSERT INTO notification_delivery (notification_id, channel, status)
           VALUES ($1, 'whatsapp', 'pending')`,
          [notificationId],
        );
      }
    }

    await c.query("COMMIT");
    return { id: notificationId };
  } catch (err) {
    await c.query("ROLLBACK").catch(() => {});
    // Don't throw — notification failure should never break the caller.
    console.error("[notify] failed:", err);
    return { id: "" };
  } finally {
    c.release();
  }
}

/**
 * Notify many users at once for the same event (e.g. all hospital admins).
 * Runs notify() per user — small N, fine to serialize.
 */
export async function notifyMany(userIds: string[], rest: Omit<NotifyInput, "userId">) {
  for (const uid of userIds) {
    await notify({ userId: uid, ...rest });
  }
}

/**
 * Find all users who should be notified for a given hospital. Used when an
 * agent submits a request — every hospital admin in that hospital gets a ping.
 */
export async function getHospitalAdminUserIds(hospitalId: string): Promise<string[]> {
  const r = await dbPool.query<{ user_id: string }>(
    `
    SELECT DISTINCT ur.user_id
    FROM user_role ur
    WHERE ur.scope_type = 'HOSPITAL'
      AND ur.scope_id   = $1
      AND ur.role       = 'HOSPITAL_ADMIN'
    `,
    [hospitalId],
  );
  return r.rows.map((x) => x.user_id);
}
