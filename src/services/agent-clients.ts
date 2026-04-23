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
                    SELECT con.contract_product FROM public.contract con
                    WHERE con.client_id = c.client_id
                    ORDER BY con.created_at DESC LIMIT 1
                ) as latest_product,
                (
                    SELECT con.next_due_date FROM public.contract con
                    WHERE con.client_id = c.client_id AND con.next_due_date IS NOT NULL
                    ORDER BY con.next_due_date ASC LIMIT 1
                ) as next_due_date,
                (
                    SELECT con.policy_status FROM public.contract con
                    WHERE con.client_id = c.client_id
                    ORDER BY con.created_at DESC LIMIT 1
                ) as latest_policy_status,
                (
                    SELECT COALESCE(SUM(cd.premium_amount), 0) FROM public.contract con
                    LEFT JOIN public.contract_detail cd ON cd.contract_id = con.contract_id
                    WHERE con.client_id = c.client_id
                ) as total_premium
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
