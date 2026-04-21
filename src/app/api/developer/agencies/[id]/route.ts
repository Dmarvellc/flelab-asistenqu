import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

const allowed = new Set(["developer", "super_admin"]);

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
