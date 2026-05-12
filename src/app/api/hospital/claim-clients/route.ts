import { getHospitalUserIdFromCookies } from "@/lib/auth-cookies";
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";

/**
 * Client search for initiating a hospital-side claim (must have assigned agent).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  try {
    const userId = await getHospitalUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (q.length < 3) {
      return NextResponse.json({ clients: [] });
    }

    const pattern = `%${q}%`;
    const result = await dbPool.query<{ client_id: string; full_name: string }>(
      `
      SELECT DISTINCT cl.client_id, p.full_name
      FROM public.client cl
      JOIN public.person p ON p.person_id = cl.person_id
      WHERE cl.agent_id IS NOT NULL
        AND (
          p.full_name ILIKE $1
          OR p.id_card ILIKE $2
          OR REPLACE(p.id_card, ' ', '') ILIKE REPLACE($3, ' ', '')
        )
      ORDER BY p.full_name ASC
      LIMIT 25
    `,
      [pattern, pattern, pattern]
    );

    return NextResponse.json({ clients: result.rows });
  } catch (error) {
    console.error("hospital claim-clients search failed", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
