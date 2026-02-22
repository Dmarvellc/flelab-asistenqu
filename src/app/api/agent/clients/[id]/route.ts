import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await dbPool.connect();
  const { id } = await params;

  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("session_agent_user_id")?.value || cookieStore.get("app_user_id")?.value;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch client details
    const clientRes = await client.query(`
      SELECT 
        c.client_id,
        p.full_name,
        p.phone_number,
        p.address,
        p.birth_date,
        p.gender,
        p.id_card,
        c.status,
        c.created_at
      FROM public.client c
      JOIN public.person p ON c.person_id = p.person_id
      WHERE c.client_id = $1 AND c.agent_id = $2
    `, [id, userId]);

    if (clientRes.rows.length === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Fetch contracts (policies)
    const contractsRes = await client.query(`
      SELECT 
        con.contract_id,
        con.contract_number,
        con.contract_product,
        con.contract_startdate,
        con.contract_duedate,
        con.status,
        con.policy_url,
        cd.sum_insured,
        cd.payment_type
      FROM public.contract con
      LEFT JOIN public.contract_detail cd ON con.contract_id = cd.contract_id
      WHERE con.client_id = $1
      ORDER BY con.created_at DESC
    `, [id]);

    return NextResponse.json({
      client: clientRes.rows[0],
      contracts: contractsRes.rows
    });

  } catch (error) {
    console.error("Fetch client detail failed", error);
    return NextResponse.json({ error: "Failed to fetch client details" }, { status: 500 });
  } finally {
    client.release();
  }
}
