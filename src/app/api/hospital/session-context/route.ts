import { getHospitalUserIdFromCookies } from "@/lib/auth-cookies";
import { NextResponse } from "next/server";
import { getHospitalIdByUserId } from "@/services/claims";
import { dbPool } from "@/lib/db";
import { logError } from "@/lib/logger";

/** Hospital portal: current user's linked hospital profile. */
export async function GET() {
  try {
    const userId = await getHospitalUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hospitalId = await getHospitalIdByUserId(userId);
    if (!hospitalId) {
      return NextResponse.json({ error: "Hospital not linked" }, { status: 403 });
    }

    const res = await dbPool.query<{ name: string }>(
      `SELECT name FROM public.hospital WHERE hospital_id = $1 LIMIT 1`,
      [hospitalId]
    );
    const row = res.rows[0];

    return NextResponse.json({
      hospital: {
        hospital_id: hospitalId,
        name: row?.name ?? "Rumah Sakit",
      },
    });
  } catch (error) {
    logError("api.hospital.session-context", error, {
      requestPath: "/api/hospital/session-context",
      requestMethod: "GET",
      isPublicFacing: true,
    });
    return NextResponse.json({ error: "Failed to load hospital context" }, { status: 500 });
  }
}
