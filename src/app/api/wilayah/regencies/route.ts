import { NextResponse } from "next/server";
import { getRegencies } from "idn-area-data";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const provinceCode = searchParams.get("province_code");

    try {
        const allRegencies = await getRegencies(); // Wait, this might be slow if it reads every time.
        // However, it's efficient enough for now (15KB).

        if (provinceCode) {
            const filtered = allRegencies.filter((regency: any) => regency.province_code === provinceCode);
            return NextResponse.json(filtered);
        }

        return NextResponse.json(allRegencies);
    } catch (error) {
        console.error("Failed to fetch regencies", error);
        return NextResponse.json({ error: "Failed to fetch regencies" }, { status: 500 });
    }
}
