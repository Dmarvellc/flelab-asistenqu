import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

const allowed = new Set(["developer", "super_admin"]);

/** GET /api/developer/agencies/[id] — fetch agency detail + stats */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: agencyId } = await params;
  const db = await dbPool.connect();
  try {
    const agencyRes = await db.query(
      `SELECT agency_id, name, address, slug, created_at FROM public.agency WHERE agency_id = $1 LIMIT 1`,
      [agencyId]
    );
    if (agencyRes.rows.length === 0) {
      return NextResponse.json({ error: "Agency tidak ditemukan." }, { status: 404 });
    }

    const [agentsRes, adminsRes, claimsRes] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS count FROM public.app_user WHERE agency_id = $1 AND role = 'agent'`,
        [agencyId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS count FROM public.app_user WHERE agency_id = $1 AND role != 'agent'`,
        [agencyId]
      ),
      db.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE c.stage = 'SUBMITTED_TO_AGENCY')::int AS pending
         FROM public.claim c
         JOIN public.app_user au ON c.created_by_user_id = au.user_id
         WHERE au.agency_id = $1`,
        [agencyId]
      ),
    ]);

    return NextResponse.json({
      agency: agencyRes.rows[0],
      stats: {
        agents: agentsRes.rows[0].count,
        admins: adminsRes.rows[0].count,
        total_claims: claimsRes.rows[0].total,
        pending_claims: claimsRes.rows[0].pending,
      },
    });
  } catch (err) {
    console.error("developer.agencies.GET", err);
    return NextResponse.json({ error: "Gagal memuat data agency." }, { status: 500 });
  } finally {
    db.release();
  }
}

/** PATCH /api/developer/agencies/[id] — update agency name / address */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: agencyId } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, address } = body as Record<string, string | undefined>;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Nama agency wajib diisi." }, { status: 400 });
  }

  const db = await dbPool.connect();
  try {
    const { rowCount } = await db.query(
      `UPDATE public.agency SET name = $1, address = $2 WHERE agency_id = $3`,
      [name.trim().toUpperCase(), address?.trim() || null, agencyId]
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Agency tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("developer.agencies.PATCH", err);
    return NextResponse.json({ error: "Gagal menyimpan perubahan." }, { status: 500 });
  } finally {
    db.release();
  }
}

/** DELETE /api/developer/agencies/[id] — remove agency and all related data */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRoleFromCookies();
  if (!role || !allowed.has(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: agencyId } = await params;
  if (!agencyId) {
    return NextResponse.json({ error: "Agency ID required" }, { status: 400 });
  }

  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    // Detach users from this agency (don't delete the users themselves)
    await client.query(
      `UPDATE public.app_user SET agency_id = NULL WHERE agency_id = $1`,
      [agencyId]
    );

    // Remove agency_member rows
    await client.query(
      `DELETE FROM public.agency_member WHERE agency_id = $1`,
      [agencyId]
    ).catch(() => {/* table may not exist */});

    // Remove pending invitations
    await client.query(
      `DELETE FROM public.agency_invitation WHERE agency_id = $1`,
      [agencyId]
    ).catch(() => {/* table may not exist */});

    // Delete the agency
    const { rowCount } = await client.query(
      `DELETE FROM public.agency WHERE agency_id = $1`,
      [agencyId]
    );

    if ((rowCount ?? 0) === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("developer.agencies.DELETE", err);
    const msg = err instanceof Error ? err.message : "Gagal menghapus agency";
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
