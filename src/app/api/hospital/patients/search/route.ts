import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const client = await dbPool.connect();
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!query || query.length < 3) {
        return NextResponse.json({ results: [] });
    }

    const result = await client.query(`
        SELECT 
            p.person_id,
            p.full_name,
            p.id_card as identity_number,
            p.phone_number
        FROM public.person p
        WHERE 
            (p.full_name ILIKE $1 OR p.id_card ILIKE $1)
        LIMIT 10
    `, [`%${query}%`]);

    return NextResponse.json({ results: result.rows });

  } catch (error) {
    console.error("Search persons failed", error);
    return NextResponse.json({ error: "Failed to search persons" }, { status: 500 });
  } finally {
    client.release();
  }
}
