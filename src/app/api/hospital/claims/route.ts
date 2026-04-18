import { getHospitalUserIdFromCookies } from "@/lib/auth-cookies";
import { NextResponse } from "next/server";
import { getHospitalClaims, getHospitalIdByUserId } from "@/services/claims";
import { logError } from "@/lib/logger";

export async function GET(req: Request) {
  let userId: string | null = null;
  try {
    userId = await getHospitalUserIdFromCookies();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hospitalId = await getHospitalIdByUserId(userId);
    const claims = await getHospitalClaims(hospitalId);

    return NextResponse.json({ claims });

  } catch (error) {
    logError("api.hospital.claims.list", error, {
      userId: userId ?? undefined,
      requestPath: "/api/hospital/claims",
      requestMethod: "GET",
      isPublicFacing: true,
    });
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}
