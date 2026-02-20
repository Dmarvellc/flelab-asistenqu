import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { composeClaimNotes, extractClaimNotes } from "@/lib/claim-form-meta";
import { deleteCacheByPattern, deleteCacheKeys, getJsonCache, setJsonCache } from "@/lib/redis";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cacheKey = `claims:agent:detail:${id}:${userId}`;
    const cached = await getJsonCache<{ claim: unknown }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const result = await client.query(`
      SELECT 
        c.claim_id,
        c.claim_number,
        c.claim_date,
        c.status,
        c.stage,
        c.total_amount,
        c.notes,
        c.log_number,
        c.log_issued_at,
        c.log_sent_to_hospital_at,
        c.log_verified_at,
        c.insurance_name,
        c.insurance_contact,
        c.created_at,
        p.full_name as client_name,
        d.name as disease_name,
        h.name as hospital_name
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      WHERE c.claim_id = $1 AND c.created_by_user_id = $2
    `, [id, userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const response = { claim: result.rows[0] };
    await setJsonCache(cacheKey, response, 30);
    return NextResponse.json(response);

  } catch (error) {
    console.error("Fetch claim failed", error);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, total_amount, notes, claim_date, claim_meta } = body;

    // Check if claim exists and belongs to agent
    const check = await client.query(
      "SELECT status FROM public.claim WHERE claim_id = $1 AND created_by_user_id = $2",
      [id, userId]
    );

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    const currentStatus = check.rows[0].status;

    // If updating status
    if (status) {
      if (status === "SUBMITTED") {
        // Submission rule: at least one supporting document is required.
        const docCountRes = await client.query(
          `
                SELECT COUNT(*)::int AS count
                FROM public.claim_document
                WHERE claim_id = $1
                `,
          [id]
        );
        const docCount = docCountRes.rows[0]?.count ?? 0;
        if (docCount < 1) {
          return NextResponse.json(
            { error: "Cannot submit claim without supporting documents" },
            { status: 400 }
          );
        }
      }

      const result = await client.query(`
          UPDATE public.claim
          SET status = $1, updated_at = NOW()
          WHERE claim_id = $2
          RETURNING claim_id, status
        `, [status, id]);

      // Add to timeline
      await client.query(`
          INSERT INTO public.claim_timeline (claim_id, event_type, to_status, actor_user_id)
          VALUES ($1, 'STATUS_CHANGE', $2, $3)
        `, [id, status, userId]);

      await deleteCacheKeys([`claims:agent:list:${userId}`, `claims:agent:detail:${id}:${userId}`]);
      await deleteCacheByPattern(`claims:agent:documents:${id}`);
      await deleteCacheByPattern(`claims:hospital:detail:${id}`);
      await deleteCacheByPattern("claims:hospital:list:*");
      return NextResponse.json({ claim: result.rows[0] });
    }

    // If updating details (only allowed in DRAFT)
    if (currentStatus !== 'DRAFT') {
      return NextResponse.json({ error: "Cannot edit claim that is not in DRAFT status" }, { status: 403 });
    }

    const detailRes = await client.query(
      `
      SELECT notes
      FROM public.claim
      WHERE claim_id = $1
      `,
      [id]
    );

    const existingRawNotes = detailRes.rows[0]?.notes || "";
    const extracted = extractClaimNotes(existingRawNotes);
    const plainNotes = notes !== undefined && notes !== null ? String(notes) : extracted.plainNotes;
    const mergedMeta = claim_meta ?? extracted.meta;
    const composedNotes = composeClaimNotes(plainNotes, mergedMeta);

    const result = await client.query(`
        UPDATE public.claim
        SET 
            total_amount = COALESCE($1, total_amount),
            notes = $2,
            claim_date = COALESCE($3, claim_date),
            updated_at = NOW()
        WHERE claim_id = $4
        RETURNING *
    `, [total_amount, composedNotes, claim_date, id]);

    await deleteCacheKeys([`claims:agent:list:${userId}`, `claims:agent:detail:${id}:${userId}`]);
    await deleteCacheByPattern(`claims:hospital:detail:${id}`);
    await deleteCacheByPattern("claims:hospital:list:*");
    return NextResponse.json({ claim: result.rows[0] });

  } catch (error) {
    console.error("Update claim failed", error);
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check status
    const check = await client.query(
      "SELECT status FROM public.claim WHERE claim_id = $1 AND created_by_user_id = $2",
      [id, userId]
    );

    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (check.rows[0].status !== 'DRAFT') {
      return NextResponse.json({ error: "Only DRAFT claims can be deleted" }, { status: 403 });
    }

    // Delete related records first (cascade should handle this but let's be safe/explicit if needed, 
    // but typically we rely on FK CASCADE or delete manually)
    // Assuming simple delete for now.

    await client.query("DELETE FROM public.claim_timeline WHERE claim_id = $1", [id]);
    await client.query("DELETE FROM public.claim_document WHERE claim_id = $1", [id]);
    await client.query("DELETE FROM public.claim_item WHERE claim_id = $1", [id]);

    await client.query("DELETE FROM public.claim WHERE claim_id = $1", [id]);

    await deleteCacheKeys([`claims:agent:list:${userId}`, `claims:agent:detail:${id}:${userId}`]);
    await deleteCacheByPattern(`claims:agent:documents:${id}`);
    await deleteCacheByPattern(`claims:hospital:detail:${id}`);
    await deleteCacheByPattern("claims:hospital:list:*");
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete claim failed", error);
    return NextResponse.json({ error: "Failed to delete claim" }, { status: 500 });
  } finally {
    client.release();
  }
}
