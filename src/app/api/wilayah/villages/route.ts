import { NextResponse } from "next/server";
import { getCachedVillages } from "@/lib/wilayah-cache";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const districtCode = searchParams.get("district_code");

    if (!districtCode) {
        return NextResponse.json({ error: "district_code is required" }, { status: 400 });
    }

    try {
        const allVillages = await getCachedVillages();
        return NextResponse.json(allVillages.filter((v: any) => v.district_code === districtCode));
    } catch (error) {
        console.error("Failed to fetch villages", error);
        return NextResponse.json({ error: "Failed to fetch villages" }, { status: 500 });
    }
}
