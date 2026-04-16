import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/services/hospital-network";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await getRecommendations({
      condition: searchParams.get("condition") || undefined,
      specialization: searchParams.get("specialization") || undefined,
      country: searchParams.get("country") || undefined,
      budget: (searchParams.get("budget") as "low" | "medium" | "high") || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
