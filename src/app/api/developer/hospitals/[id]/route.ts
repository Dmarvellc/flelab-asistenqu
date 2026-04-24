import { NextResponse } from "next/server";
import { z } from "zod";
import { dbPool } from "@/lib/db";
import { getRoleFromCookies } from "@/lib/auth-cookies";

export const dynamic = "force-dynamic";

const allowed = new Set(["developer", "super_admin"]);
const hospitalIdSchema = z.string().uuid();

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    const role = await getRoleFromCookies();
    if (!role || !allowed.has(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: rawId } = await params;
    const parsed = hospitalIdSchema.safeParse(rawId);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid hospital id" }, { status: 400 });
    }
    const hospitalId = parsed.data;

    const client = await dbPool.connect();
    try {
        // Block delete if the hospital has linked activity (admins / claims / requests)
        const checks = await client.query(
            `
            SELECT
                (SELECT COUNT(*) FROM public.user_role
                 WHERE scope_type = 'HOSPITAL' AND scope_id = $1)::int AS admins,
                (SELECT COUNT(*) FROM public.claim
                 WHERE hospital_id = $1)::int AS claims,
                (SELECT COALESCE((
                    SELECT COUNT(*) FROM public.patient_data_request
                    WHERE hospital_id = $1
                ), 0))::int AS requests
            `,
            [hospitalId]
        );
        const { admins, claims, requests } = checks.rows[0] ?? {};

        if ((admins ?? 0) + (claims ?? 0) + (requests ?? 0) > 0) {
            return NextResponse.json(
                {
                    error: "Rumah sakit masih memiliki aktivitas terkait. Hapus / pindahkan dulu.",
                    detail: { admins, claims, requests },
                },
                { status: 409 }
            );
        }

        const res = await client.query(
            `DELETE FROM public.hospital WHERE hospital_id = $1 RETURNING hospital_id, name`,
            [hospitalId]
        );

        if (res.rowCount === 0) {
            return NextResponse.json({ error: "Rumah sakit tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({ deleted: res.rows[0] });
    } catch (error) {
        console.error("Delete hospital failed", error);
        return NextResponse.json({ error: "Gagal menghapus rumah sakit" }, { status: 500 });
    } finally {
        client.release();
    }
}
