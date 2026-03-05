import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { saveDocument } from "@/lib/file-upload";

export async function POST(req: Request) {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("session_admin_agency_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get agency_id for this user
        const userRes = await client.query("SELECT agency_id FROM public.app_user WHERE user_id = $1", [userId]);
        if (userRes.rows.length === 0 || !userRes.rows[0].agency_id) {
            return NextResponse.json({ error: "No agency associated with this user" }, { status: 403 });
        }
        const agencyId = userRes.rows[0].agency_id;

        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const url = await saveDocument(file, `claim-template-${agencyId}`);
        if (!url) {
            return NextResponse.json({ error: "Failed to save document. It must be a PDF or image under 10MB." }, { status: 500 });
        }

        // Update agency
        await client.query(
            "UPDATE public.agency SET claim_form_url = $1 WHERE agency_id = $2",
            [url, agencyId]
        );

        return NextResponse.json({ url });
    } catch (e) {
        console.error("POST template error", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        client.release();
    }
}
