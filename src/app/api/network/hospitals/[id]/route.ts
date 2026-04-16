import { NextRequest, NextResponse } from "next/server";
import { getHospitalDetail } from "@/services/hospital-network";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getHospitalDetail(id);
    if (!result) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching hospital detail:", error);
    return NextResponse.json({ error: "Failed to fetch hospital detail" }, { status: 500 });
  }
}
