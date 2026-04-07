import { NextRequest, NextResponse } from "next/server";
import { searchHospitals } from "@/services/hospital-network";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await searchHospitals({
      q: searchParams.get("q") || undefined,
      country: searchParams.get("country") || undefined,
      city: searchParams.get("city") || undefined,
      tier: searchParams.get("tier") || undefined,
      specialization: searchParams.get("specialization") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching network hospitals:", error);
    return NextResponse.json({ error: "Failed to fetch hospitals" }, { status: 500 });
  }
}
