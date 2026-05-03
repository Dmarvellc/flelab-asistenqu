import { NextResponse } from "next/server";
import { getCachedRegencies } from "@/lib/wilayah-cache";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provinceCode = searchParams.get("province_code");

    try {
        const allRegencies = await getCachedRegencies();
        if (provinceCode) {
            return NextResponse.json(allRegencies.filter((r: any) => r.province_code === provinceCode));
        }
        return NextResponse.json(allRegencies);
    } catch (error) {
        console.error("Failed to fetch regencies", error);
        return NextResponse.json({ error: "Failed to fetch regencies" }, { status: 500 });
    }
}
