import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

const allowed = new Set(["developer", "super_admin"]);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "agency";
}

async function uniqueSlug(client: import("pg").PoolClient, base: string): Promise<string> {
  let candidate = base;
  let i = 1;
  // Loop is bounded — in practice resolves in 1-2 iterations.
  while (true) {
    const { rowCount } = await client.query(
      `SELECT 1 FROM public.agency WHERE slug = $1 LIMIT 1`,
      [candidate],
    );
    if ((rowCount ?? 0) === 0) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
    if (i > 50) return `${base}-${Date.now()}`;
  }
}

export async function GET() {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const client = await dbPool.connect();
  try {
    const res = await client.query(`
      SELECT
        a.agency_id,
        a.name,
        a.slug,
        a.address,
        a.created_at,
        COUNT(DISTINCT m.user_id) FILTER (WHERE m.status = 'ACTIVE')::int AS member_count,
        COUNT(DISTINCT m.user_id) FILTER (
          WHERE m.status = 'ACTIVE' AND m.role = 'master_admin'
        )::int AS master_admin_count
      FROM public.agency a
      LEFT JOIN public.agency_member m ON m.agency_id = a.agency_id
      GROUP BY a.agency_id, a.name, a.slug, a.address, a.created_at
      ORDER BY a.created_at DESC
    `);

    return NextResponse.json({ agencies: res.rows });
  } catch (e) {
    console.error("developer.agencies.GET", e);
    return NextResponse.json({ agencies: [] });
  } finally {
    client.release();
  }
}

/**
 * Create an organization (agency) only — no master_admin attached yet.
 * The next step in the UI is to invite a master_admin via
 * POST /api/developer/agencies/[id]/invitations.
 */
export async function POST(request: NextRequest) {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    address?: string;
    slug?: string;
  } | null;

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Nama agency wajib diisi" }, { status: 400 });
  }

  const client = await dbPool.connect();
  try {
    const slug = await uniqueSlug(client, slugify(body?.slug || name));
    const { rows } = await client.query(
      `INSERT INTO public.agency (name, address, slug, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING agency_id, name, slug, address, created_at`,
      [name, body?.address?.trim() || null, slug],
    );
    return NextResponse.json({ agency: rows[0] });
  } catch (err) {
    console.error("developer.agencies.POST", err);
    const msg = err instanceof Error ? err.message : "Gagal membuat agency";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
