import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const regencyCode = searchParams.get("regency_code");

    try {
        if (regencyCode) {
            const result = await dbPool.query<{
                code: string;
                regency_code: string;
                name: string;
            }>(
                `SELECT code, regency_code, name
                 FROM public.idn_district
                 WHERE regency_code = $1
                 ORDER BY code`,
                [regencyCode]
            );
            return NextResponse.json(result.rows);
        }

        const result = await dbPool.query<{
            code: string;
            regency_code: string;
            name: string;
        }>(`SELECT code, regency_code, name FROM public.idn_district ORDER BY code`);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Failed to fetch districts", error);
        return NextResponse.json({ error: "Failed to fetch districts" }, { status: 500 });
    }
}
