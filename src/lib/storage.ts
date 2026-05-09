import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { hasSupabaseAdminConfig, getSupabaseAdmin } from "@/lib/supabase-admin";

const POLICY_BUCKET = "policy-documents";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
};

function parseBase64(data: string): { mime: string; buffer: Buffer } | null {
  const match = data.match(/^data:([A-Za-z0-9+\-/]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1];
  if (!ALLOWED_MIME[mime]) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_SIZE_BYTES) return null;
  return { mime, buffer };
}

/**
 * Upload file polis ke Supabase Storage.
 * Jika Supabase tidak terkonfigurasi, fallback ke filesystem lokal.
 * Mengembalikan public URL atau path relatif, atau null jika gagal.
 */
export async function uploadPolicyFile(base64Data: string): Promise<string | null> {
  const parsed = parseBase64(base64Data);
  if (!parsed) return null;

  const { mime, buffer } = parsed;
  const ext = ALLOWED_MIME[mime];
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}${ext}`;

  // ── Supabase Storage ─────────────────────────────────────────
  if (hasSupabaseAdminConfig()) {
    try {
      const supabase = getSupabaseAdmin();
      const storagePath = `policies/${uniqueName}`;

      // Pastikan bucket ada (idempotent)
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((b) => b.name === POLICY_BUCKET);
      if (!bucketExists) {
        await supabase.storage.createBucket(POLICY_BUCKET, { public: true });
      }

      const { error } = await supabase.storage
        .from(POLICY_BUCKET)
        .upload(storagePath, buffer, { contentType: mime, upsert: false });

      if (!error) {
        const { data } = supabase.storage
          .from(POLICY_BUCKET)
          .getPublicUrl(storagePath);
        return data.publicUrl;
      }
    } catch {
      // fall through ke filesystem
    }
  }

  // ── Filesystem fallback ──────────────────────────────────────
  try {
    const dir = path.join(process.cwd(), "public", "uploads", "policies");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, uniqueName), buffer);
    return `/uploads/policies/${uniqueName}`;
  } catch {
    return null;
  }
}

/**
 * Pastikan agent record ada untuk user_id tertentu.
 * Admin agency yang ingin bertindak sebagai agent membutuhkan ini.
 */
export async function ensureAgentRecord(
  dbClient: import("pg").PoolClient,
  userId: string,
  fullName: string,
): Promise<void> {
  const existing = await dbClient.query(
    "SELECT agent_id FROM public.agent WHERE agent_id = $1",
    [userId],
  );
  if (existing.rows.length > 0) return;

  // Ambil insurance_id pertama yang ada, atau buat baru
  let insuranceId: string;
  const insRes = await dbClient.query(
    "SELECT insurance_id FROM public.insurance LIMIT 1",
  );
  if (insRes.rows.length > 0) {
    insuranceId = insRes.rows[0].insurance_id;
  } else {
    const newIns = await dbClient.query(
      "INSERT INTO public.insurance (insurance_name) VALUES ('Independent') RETURNING insurance_id",
    );
    insuranceId = newIns.rows[0].insurance_id;
  }

  await dbClient.query(
    `INSERT INTO public.agent (agent_id, agent_name, insurance_id, status)
     VALUES ($1, $2, $3, 'ACTIVE')
     ON CONFLICT (agent_id) DO NOTHING`,
    [userId, fullName, insuranceId],
  );
}
