import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, requireScopeAccess } from "@/lib/auth";
import { dbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const claimIdSchema = z.string().uuid();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rawId } = await params;
        const claimId = claimIdSchema.parse(rawId);

        // Authorize via same scope check used by workflow route
        await requireScopeAccess("claim", claimId);

        const client = await dbPool.connect();
        try {
            const { rows } = await client.query(
                `
                SELECT
                    ct.*,
                    p.full_name AS actor_name,
                    au.role_id  AS actor_role
                FROM public.claim_timeline ct
                LEFT JOIN public.app_user au
                    ON au.user_id = ct.actor_user_id
                LEFT JOIN public.user_person_link upl
                    ON upl.user_id = ct.actor_user_id
                LEFT JOIN public.person p
                    ON p.person_id = upl.person_id
                WHERE ct.claim_id = $1
                ORDER BY ct.created_at ASC
                `,
                [claimId]
            );

            return NextResponse.json({ events: rows });
        } finally {
            client.release();
        }
    } catch (error) {
        if (error instanceof AuthError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid claim id" }, { status: 400 });
        }
        console.error("Claim timeline read failed", error);
        return NextResponse.json({ error: "Failed to load claim timeline" }, { status: 500 });
    }
}
