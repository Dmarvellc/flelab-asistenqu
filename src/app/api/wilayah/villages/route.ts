import { NextResponse } from "next/server";
import { getVillages } from "idn-area-data";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const districtCode = searchParams.get("district_code");

    try {
        const allVillages = await getVillages(); // This reads 2.8MB CSV.

        if (districtCode) {
            const filtered = allVillages.filter((village: any) => village.district_code === districtCode);
            return NextResponse.json(filtered);
        }

        // Returning 83k items (2.8MB+) is bad. Only allow return if filter is present or limit it.
        // If no filter, maybe return empty or first 100? Or error?
        // Let's return error if no filter to prevent massive payload unless intentionally asked.
        return NextResponse.json({ error: "district_code is required" }, { status: 400 });
    } catch (error) {
        console.error("Failed to fetch villages", error);
        return NextResponse.json({ error: "Failed to fetch villages" }, { status: 500 });
    }
}
