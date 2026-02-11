import { NextResponse } from "next/server";
import { getDistricts } from "idn-area-data";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const regencyCode = searchParams.get("regency_code");

    try {
        const allDistricts = await getDistricts();

        if (regencyCode) {
            const filtered = allDistricts.filter((district: any) => district.regency_code === regencyCode);
            return NextResponse.json(filtered);
        }

        // Returning all districts (186KB) is fine for initial full fetch if needed, 
        // but filtering is better.
        return NextResponse.json(allDistricts);
    } catch (error) {
        console.error("Failed to fetch districts", error);
        return NextResponse.json({ error: "Failed to fetch districts" }, { status: 500 });
    }
}
