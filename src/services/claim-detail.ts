import { dbPool } from "@/lib/db";
import { Claim } from "@/lib/claims-data";

export async function getClaimById(claimId: string): Promise<Claim | null> {
    const client = await dbPool.connect();
    try {
        const query = `
      SELECT 
        c.claim_id,
        c.claim_date::text,
        c.status,
        c.stage,
        c.total_amount,
        c.notes,
        c.agent_notes,
        c.hospital_notes,
        c.admin_review_notes,
        p.full_name as client_name,
        d.name as disease_name,
        h.name as hospital_name,
        ct.contract_number as policy_number,
        c.created_at
      FROM public.claim c
      JOIN public.client cl ON c.client_id = cl.client_id
      JOIN public.person p ON cl.person_id = p.person_id
      LEFT JOIN public.contract ct ON c.contract_id = ct.contract_id
      LEFT JOIN public.disease d ON c.disease_id = d.disease_id
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      WHERE c.claim_id = $1
    `;

        const result = await client.query(query, [claimId]);

        if (result.rows.length === 0) return null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = result.rows[0];
        return {
            ...row,
            total_amount: Number(row.total_amount),
        };
    } finally {
        client.release();
    }
}
