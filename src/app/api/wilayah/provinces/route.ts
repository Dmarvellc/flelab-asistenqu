import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET() {
    try {
        const result = await dbPool.query<{ code: string; name: string }>(
            `SELECT code, name FROM public.idn_province ORDER BY code`
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Failed to fetch provinces", error);
        return NextResponse.json({ error: "Failed to fetch provinces" }, { status: 500 });
    }
}
