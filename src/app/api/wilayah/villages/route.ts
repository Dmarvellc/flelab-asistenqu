import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const districtCode = searchParams.get("district_code");

    try {
        if (districtCode) {
            const result = await dbPool.query<{
                code: string;
                district_code: string;
                name: string;
            }>(
                `SELECT code, district_code, name
                 FROM public.idn_village
                 WHERE district_code = $1
                 ORDER BY code`,
                [districtCode]
            );
            return NextResponse.json(result.rows);
        }

        const result = await dbPool.query<{
            code: string;
            district_code: string;
            name: string;
        }>(`SELECT code, district_code, name FROM public.idn_village ORDER BY code`);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Failed to fetch villages", error);
        return NextResponse.json({ error: "Failed to fetch villages" }, { status: 500 });
    }
}
