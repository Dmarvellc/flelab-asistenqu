import { dbPool } from "@/lib/db";

export async function getAgentRequests(userId: string) {
    const client = await dbPool.connect();
    try {
        const agentLookup = await client.query(`
            SELECT a.agent_id 
            FROM public.agent a
            JOIN public.user_person_link upl ON a.person_id = upl.person_id
            WHERE upl.user_id = $1
        `, [userId]);

        if (agentLookup.rowCount === 0) {
            return [];
        }

        const agentId = agentLookup.rows[0].agent_id;

        const result = await client.query(`
            SELECT 
                r.request_id,
                r.person_id,
                r.status,
                r.additional_data_request,
                r.additional_data_file,
                r.created_at,
                p.full_name as person_name,
                p.id_card as person_nik,
                h.email as hospital_email
            FROM public.patient_data_request r
            JOIN public.person p ON r.person_id = p.person_id
            JOIN public.app_user h ON r.hospital_id = h.user_id
            WHERE r.agent_id = $1
            ORDER BY r.created_at DESC
        `, [agentId]);

        return result.rows;
    } finally {
        client.release();
    }
}
