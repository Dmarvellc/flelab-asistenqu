import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET() {
    const client = await dbPool.connect();
    try {
        const result = await client.query("SELECT agency_id, name FROM public.agency ORDER BY name ASC");
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch agencies" }, { status: 500 });
    } finally {
        client.release();
    }
}
