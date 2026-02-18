
import { dbPool } from "@/lib/db";

export interface OrphanPolicy {
    contract_id: string;
    contract_number: string;
    contract_product: string;
    client_name: string;
    client_address: string;
    created_at: string;
}

export async function getOrphanPolicies(): Promise<OrphanPolicy[]> {
    const client = await dbPool.connect();
    try {
        const query = `
      SELECT 
        c.contract_id,
        c.contract_number,
        c.contract_product,
        p.full_name as client_name,
        p.address as client_address,
        c.created_at
      FROM public.contract c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      WHERE cl.agent_id IS NULL
      ORDER BY c.created_at DESC
      LIMIT 5
    `;
        const res = await client.query<OrphanPolicy>(query);
        return res.rows;
    } finally {
        client.release();
    }
}
