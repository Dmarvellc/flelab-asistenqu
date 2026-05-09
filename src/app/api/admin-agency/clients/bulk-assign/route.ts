import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminRoles = ["admin_agency", "insurance_admin", "super_admin"];
  if (!adminRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agencyId = session.agencyId;
  if (!agencyId && session.role !== "super_admin") {
    return NextResponse.json({ error: "Akun tidak terhubung ke agensi" }, { status: 403 });
  }

  let clientIds: string[];
  let agentId: string;

  try {
    const body = await req.json();
    clientIds = body.clientIds;
    agentId = body.agentId;
  } catch {
    return NextResponse.json({ error: "Request body tidak valid" }, { status: 400 });
  }

  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: "clientIds harus berupa array non-kosong" }, { status: 400 });
  }
  if (!agentId) {
    return NextResponse.json({ error: "agentId diperlukan" }, { status: 400 });
  }
  if (clientIds.length > 5000) {
    return NextResponse.json({ error: "Maksimal 5.000 klien per operasi" }, { status: 400 });
  }

  const dbClient = await dbPool.connect();
  try {
    // ── Verifikasi agent ada di agency yang sama ─────────────────
    const agentRes = await dbClient.query(
      `SELECT u.user_id, p.full_name
       FROM public.app_user u
       LEFT JOIN public.user_person_link upl ON upl.user_id = u.user_id
       LEFT JOIN public.person p ON p.person_id = upl.person_id
       WHERE u.user_id = $1
         AND u.agency_id = $2
         AND u.role IN ('agent','agent_manager','admin_agency')`,
      [agentId, agencyId ?? null],
    );

    if (agentRes.rows.length === 0) {
      return NextResponse.json(
        { error: "Agen target tidak ditemukan di agensi Anda" },
        { status: 400 },
      );
    }

    await dbClient.query("BEGIN");

    // ── Validasi semua client_id milik agensi ini ─────────────────
    // Menggunakan ANY($1) untuk performa dengan array besar
    const validationRes = await dbClient.query(
      `SELECT c.client_id, c.agent_id as old_agent_id
       FROM public.client c
       WHERE c.client_id = ANY($1::uuid[])
         AND (
           -- Klien sudah assigned ke agent di agensi ini
           c.agent_id IN (
             SELECT user_id FROM public.app_user WHERE agency_id = $2
           )
           OR
           -- Klien belum assigned (unassigned) tapi dibuat oleh admin agensi ini
           (c.agent_id IS NULL AND c.created_by_user_id IN (
             SELECT user_id FROM public.app_user WHERE agency_id = $2
           ))
         )`,
      [clientIds, agencyId],
    );

    const validIds = new Set(validationRes.rows.map((r: { client_id: string }) => r.client_id));
    const invalidIds = clientIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      await dbClient.query("ROLLBACK");
      return NextResponse.json(
        {
          error: `${invalidIds.length} klien tidak ditemukan atau bukan milik agensi Anda`,
          invalidIds: invalidIds.slice(0, 10),
        },
        { status: 400 },
      );
    }

    // ── Update client records ─────────────────────────────────────
    await dbClient.query(
      `UPDATE public.client
       SET agent_id = $1, assigned_at = NOW()
       WHERE client_id = ANY($2::uuid[])`,
      [agentId, clientIds],
    );

    // ── Tulis audit log untuk setiap client ──────────────────────
    // Batch insert audit log (satu query untuk semua)
    const auditValues = validationRes.rows
      .map(
        (_: unknown, idx: number) =>
          `($${idx * 5 + 1}, 'assigned', $${idx * 5 + 2}, $${idx * 5 + 3}, $${idx * 5 + 4}, $${idx * 5 + 5})`,
      )
      .join(",");

    const auditParams: unknown[] = [];
    for (const r of validationRes.rows as Array<{ client_id: string; old_agent_id: string | null }>) {
      auditParams.push(
        r.client_id,
        r.old_agent_id ?? null,
        agentId,
        session.userId,
        JSON.stringify({ source: "bulk_assign" }),
      );
    }

    if (auditParams.length > 0) {
      await dbClient.query(
        `INSERT INTO public.client_audit
           (client_id, event_type, from_agent_id, to_agent_id, by_user_id, metadata)
         VALUES ${auditValues}`,
        auditParams,
      );
    }

    await dbClient.query("COMMIT");

    return NextResponse.json({
      success: true,
      assigned: validIds.size,
      agentId,
    });
  } catch (error) {
    await dbClient.query("ROLLBACK");
    console.error("Bulk assign error:", error);
    return NextResponse.json({ error: "Gagal mengassign klien" }, { status: 500 });
  } finally {
    dbClient.release();
  }
}
