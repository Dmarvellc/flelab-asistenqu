import { NextResponse } from "next/server";
import { getProvinces } from "idn-area-data";

export async function GET() {
    try {
        const provinces = await getProvinces();
        // The library returns { code: string, name: string }
        return NextResponse.json(provinces);
    } catch (error) {
        console.error("Failed to fetch provinces", error);
        return NextResponse.json({ error: "Failed to fetch provinces" }, { status: 500 });
    }
}
