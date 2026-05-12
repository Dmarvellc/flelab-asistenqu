import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provinceCode = searchParams.get("province_code");

    try {
        if (provinceCode) {
            const result = await dbPool.query<{
                code: string;
                province_code: string;
                name: string;
            }>(
                `SELECT code, province_code, name
                 FROM public.idn_regency
                 WHERE province_code = $1
                 ORDER BY code`,
                [provinceCode]
            );
            return NextResponse.json(result.rows);
        }

        const result = await dbPool.query<{
            code: string;
            province_code: string;
            name: string;
        }>(`SELECT code, province_code, name FROM public.idn_regency ORDER BY code`);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Failed to fetch regencies", error);
        return NextResponse.json({ error: "Failed to fetch regencies" }, { status: 500 });
    }
}
