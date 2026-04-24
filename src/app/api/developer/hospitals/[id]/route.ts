import { NextResponse } from "next/server";
import { z } from "zod";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

const allowed = new Set(["developer", "super_admin"]);
const hospitalIdSchema = z.string().uuid();

type HospitalAdmin = {
    user_role_id: string;
    user_id: string;
    email: string;
    role: string;
    full_name: string | null;
    phone_number: string | null;
    status: string;
    created_at: string;
};

type HospitalImpact = {
    admins: number;
    claims: number;
    patient_requests: number;
    appointments: number;
    doctors: number;
};

/**
 * GET /api/developer/hospitals/[id]
 *
 * Returns hospital detail + every admin user linked to the hospital +
 * counts of dependent rows. This powers the delete confirmation UI
 * so developers can see exactly what will be affected.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const role = await getRoleFromCookies();
    if (!role || !allowed.has(role)) {
        return NextResponse.json({ error: "Akses ditolak. Halaman ini hanya untuk developer." }, { status: 403 });
    }

    const { id: rawId } = await params;
    const parsed = hospitalIdSchema.safeParse(rawId);
    if (!parsed.success) {
        return NextResponse.json({ error: "ID rumah sakit tidak valid." }, { status: 400 });
    }
    const hospitalId = parsed.data;

    const client = await dbPool.connect();
    try {
        const hospitalRes = await client.query(
            `SELECT hospital_id, name, address, phone, email, city, type, tier,
                    is_partner, status, created_at, updated_at
             FROM public.hospital
             WHERE hospital_id = $1
             LIMIT 1`,
            [hospitalId]
        );

        if (hospitalRes.rowCount === 0) {
            return NextResponse.json({ error: "Rumah sakit tidak ditemukan." }, { status: 404 });
        }

        const hospital = hospitalRes.rows[0];

        const [adminsRes, impactRes] = await Promise.all([
            client.query<HospitalAdmin>(
                `
                SELECT
                    ur.user_role_id,
                    ur.user_id,
                    u.email,
                    ur.role::text                AS role,
                    u.status                     AS status,
                    ur.created_at                AS created_at,
                    p.full_name                  AS full_name,
                    p.phone_number               AS phone_number
                FROM public.user_role ur
                JOIN public.app_user u ON u.user_id = ur.user_id
                LEFT JOIN public.user_person_link upl
                    ON upl.user_id = ur.user_id
                LEFT JOIN public.person p
                    ON p.person_id = upl.person_id
                WHERE ur.scope_type = 'HOSPITAL'
                  AND ur.scope_id   = $1
                ORDER BY ur.created_at DESC
                `,
                [hospitalId]
            ),
            client.query<HospitalImpact>(
                `
                SELECT
                    (SELECT COUNT(*) FROM public.user_role
                     WHERE scope_type = 'HOSPITAL' AND scope_id = $1)::int      AS admins,
                    (SELECT COUNT(*) FROM public.claim
                     WHERE hospital_id = $1)::int                               AS claims,
                    (SELECT COUNT(*) FROM public.patient_data_request
                     WHERE hospital_id = $1)::int                               AS patient_requests,
                    (SELECT COUNT(*) FROM public.appointment
                     WHERE hospital_id = $1)::int                               AS appointments,
                    (SELECT COUNT(*) FROM public.doctors
                     WHERE hospital_id = $1)::int                               AS doctors
                `,
                [hospitalId]
            ),
        ]);

        return NextResponse.json({
            hospital,
            admins: adminsRes.rows,
            impact: impactRes.rows[0] ?? {
                admins: 0,
                claims: 0,
                patient_requests: 0,
                appointments: 0,
                doctors: 0,
            },
        });
    } catch (error) {
        console.error("developer.hospitals.detail", error);
        return NextResponse.json({ error: "Gagal memuat data rumah sakit." }, { status: 500 });
    } finally {
        client.release();
    }
}

/**
 * DELETE /api/developer/hospitals/[id]
 *
 * Safely removes a hospital and every tight dependency:
 *   - detaches admin user_role rows (users themselves stay)
 *   - nulls out claim.hospital_id (handled by FK SET NULL)
 *   - nulls out doctors.hospital_id (plural / staff table, NO ACTION FK)
 *   - nulls out appointment.hospital_id (NO ACTION FK)
 *   - deletes patient_data_request rows (NOT NULL column, owned by hospital)
 *
 * This mirrors how agencies are cleanly removed.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const role = await getRoleFromCookies();
    if (!role || !allowed.has(role)) {
        return NextResponse.json({ error: "Akses ditolak. Halaman ini hanya untuk developer." }, { status: 403 });
    }

    const { id: rawId } = await params;
    const parsed = hospitalIdSchema.safeParse(rawId);
    if (!parsed.success) {
        return NextResponse.json({ error: "ID rumah sakit tidak valid." }, { status: 400 });
    }
    const hospitalId = parsed.data;

    const client = await dbPool.connect();
    try {
        await client.query("BEGIN");

        // detach admins: drop scoped role rows so users stay but lose access
        await client.query(
            `DELETE FROM public.user_role
             WHERE scope_type = 'HOSPITAL' AND scope_id = $1`,
            [hospitalId]
        );

        // NOT NULL FK targets — delete or null out manually
        await client
            .query(`DELETE FROM public.patient_data_request WHERE hospital_id = $1`, [hospitalId])
            .catch(() => { /* table may not exist */ });

        await client
            .query(`UPDATE public.appointment SET hospital_id = NULL WHERE hospital_id = $1`, [hospitalId])
            .catch(() => { /* column may be NOT NULL in older installs */ });

        await client
            .query(`UPDATE public.doctors SET hospital_id = NULL WHERE hospital_id = $1`, [hospitalId])
            .catch(() => { /* legacy doctors table; safe to ignore */ });

        const del = await client.query(
            `DELETE FROM public.hospital WHERE hospital_id = $1 RETURNING hospital_id, name`,
            [hospitalId]
        );

        if (del.rowCount === 0) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Rumah sakit tidak ditemukan." }, { status: 404 });
        }

        await client.query("COMMIT");
        return NextResponse.json({
            deleted: del.rows[0],
            message: `Rumah sakit "${del.rows[0].name}" berhasil dihapus.`,
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => { });
        console.error("developer.hospitals.delete", error);
        const message =
            error instanceof Error && error.message
                ? `Gagal menghapus rumah sakit: ${error.message}`
                : "Gagal menghapus rumah sakit.";
        return NextResponse.json({ error: message }, { status: 500 });
    } finally {
        client.release();
    }
}
