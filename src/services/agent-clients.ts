import { dbPool } from "@/lib/db";

export async function getAgentClients(userId: string) {
    const client = await dbPool.connect();
    try {
        const result = await client.query(`
            SELECT 
                c.client_id,
                p.full_name,
                p.phone_number,
                p.address,
                c.status,
                c.created_at,
                (
                    SELECT COUNT(*) FROM public.contract con WHERE con.client_id = c.client_id
                ) as contract_count,
                (
                    SELECT con.contract_product FROM public.contract con WHERE con.client_id = c.client_id LIMIT 1
                ) as latest_product
            FROM public.client c
            JOIN public.person p ON c.person_id = p.person_id
            WHERE c.agent_id = $1
            ORDER BY c.created_at DESC
        `, [userId]);

        return result.rows;
    } finally {
        client.release();
    }
}
