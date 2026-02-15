import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getJsonCache, setJsonCache } from "@/lib/redis";
import { getHospitalClaims, getHospitalIdByUserId } from "@/services/claims";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = `claims:hospital:list:${userId}`;
    const cached = await getJsonCache<{ claims: unknown[] }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const hospitalId = await getHospitalIdByUserId(userId);
    const claims = await getHospitalClaims(hospitalId);

    const response = { claims };
    await setJsonCache(cacheKey, response, 30);
    return NextResponse.json(response);

  } catch (error) {
    console.error("Fetch hospital claims failed", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}
