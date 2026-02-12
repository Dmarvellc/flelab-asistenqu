import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import { getJsonCache, setJsonCache } from "@/lib/redis";

export async function GET(req: Request) {
  const client = await dbPool.connect();
  
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

    // Attempt to get hospital_id from user_role
    const roleRes = await client.query(`
      SELECT scope_id 
      FROM public.user_role 
      WHERE user_id = $1 AND scope_type = 'HOSPITAL' 
      LIMIT 1
    `, [userId]);

    let hospitalId = null;
    if (roleRes.rows.length > 0) {
        hospitalId = roleRes.rows[0].scope_id;
    }

    let query = `
      SELECT 
        c.claim_id,
        c.claim_date,
        c.status,
        c.total_amount,
        p.full_name as client_name,
        d.name as disease_name,
        h.name as hospital_name
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      WHERE c.status != 'DRAFT'
    `;
    
    const queryParams: any[] = [];
    
    if (hospitalId) {
        query += ` AND c.hospital_id = $${queryParams.length + 1}`;
        queryParams.push(hospitalId);
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await client.query(query, queryParams);

    const response = { claims: result.rows };
    await setJsonCache(cacheKey, response, 30);
    return NextResponse.json(response);

  } catch (error) {
    console.error("Fetch hospital claims failed", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  } finally {
    client.release();
  }
}
