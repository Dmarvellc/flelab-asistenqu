import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

export async function GET() {
  const client = await dbPool.connect();
  try {
    const result = await client.query(`SELECT disease_id, name, icd10_code FROM public.disease ORDER BY name`);
    return NextResponse.json({ diseases: result.rows });
  } catch (error) {
    console.error("Failed to fetch diseases", error);
    return NextResponse.json({ error: "Failed to fetch diseases" }, { status: 500 });
  } finally {
    client.release();
  }
}
