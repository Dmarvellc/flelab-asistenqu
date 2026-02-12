import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET() {
  const client = await dbPool.connect();
  try {
    const result = await client.query(`SELECT hospital_id, name FROM public.hospital WHERE status = 'ACTIVE' ORDER BY name`);
    return NextResponse.json({ hospitals: result.rows });
  } catch (error) {
    console.error("Failed to fetch hospitals", error);
    return NextResponse.json({ error: "Failed to fetch hospitals" }, { status: 500 });
  } finally {
    client.release();
  }
}
