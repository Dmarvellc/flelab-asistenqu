import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET() {
    const client = await dbPool.connect();
    try {
        await client.query("ALTER TABLE public.contract ADD COLUMN IF NOT EXISTS policy_url TEXT;");
        return NextResponse.json({ success: true, message: "Migration executed: Added policy_url to contract table." });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}
