import { NextResponse } from "next/server";
import { REGENCIES } from "@/lib/wilayah-cache";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provinceCode = searchParams.get("province_code");
    if (provinceCode) {
        return NextResponse.json(REGENCIES.filter((r) => r.province_code === provinceCode));
    }
    return NextResponse.json(REGENCIES);
}
