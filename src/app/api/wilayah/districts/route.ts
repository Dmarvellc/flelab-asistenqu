import { NextResponse } from "next/server";
import { getCachedDistricts } from "@/lib/wilayah-cache";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const regencyCode = searchParams.get("regency_code");

    try {
        const allDistricts = await getCachedDistricts();
        if (regencyCode) {
            return NextResponse.json(allDistricts.filter((d: any) => d.regency_code === regencyCode));
        }
        return NextResponse.json(allDistricts);
    } catch (error) {
        console.error("Failed to fetch districts", error);
        return NextResponse.json({ error: "Failed to fetch districts" }, { status: 500 });
    }
}
