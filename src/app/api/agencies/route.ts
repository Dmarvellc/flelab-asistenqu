import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET() {
    try {
        const result = await dbPool.query(
            `SELECT agency_id, name FROM public.agency ORDER BY name ASC`
        );
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Failed to fetch agencies:", error);
        return NextResponse.json(
            { error: "Failed to fetch agencies" },
            { status: 500 }
        );
    }
}
