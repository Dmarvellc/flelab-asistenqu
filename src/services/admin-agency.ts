import { dbPool } from "@/lib/db";
import { Claim } from "@/lib/claims-data"; // Use shared type

export interface AgencyTransferRequest {
    request_id: string;
    request_type?: string;
    agent_id: string;
    agent_name?: string; // Optional because join might fail if data inconsistent
    from_agency_name?: string;
    to_agency_name?: string;
    status: string;
    request_reason?: string;
    requested_at: string;
}

export interface AgencyAgent {
    user_id: string;
    full_name: string;
    email: string;
    phone_number: string;
    status: string;
    joined_at: string;
    total_policies: number;
    total_claims: number;
}

export type AgentPerf = {
    user_id: string;
    email: string;
    agent_name: string;
    total_points: number;
    rank_label: string;
    commission_multiplier: number;
    total_clients: number;
    total_claims: number;
    approved_claims: number;
    rejected_claims: number;
    pending_claims: number;
    total_approved_value: number;
    referral_points: number;
    referral_code: string | null;
};

export interface AgencyClient {
    client_id: string;
    full_name: string;
    agent_id: string;
    agent_name: string;
    total_policies: number;
}

export async function getPendingTransfers(agencyId: string): Promise<AgencyTransferRequest[]> {
    const client = await dbPool.connect();
    try {
        // Query to fetch pending transfer requests with agent and agency details
        const res = await client.query(`
            SELECT 
                tr.request_id,
                tr.agent_id,
                p.full_name as agent_name,
                a1.name as from_agency_name,
                a2.name as to_agency_name,
                tr.status,
                tr.request_reason,
                tr.requested_at
            FROM agency_transfer_request tr
            JOIN app_user u ON tr.agent_id = u.user_id
            LEFT JOIN user_person_link upl ON u.user_id = upl.user_id
            LEFT JOIN person p ON upl.person_id = p.person_id
            LEFT JOIN agency a1 ON tr.from_agency_id = a1.agency_id
            LEFT JOIN agency a2 ON tr.to_agency_id = a2.agency_id
            WHERE tr.status = 'PENDING' AND (tr.from_agency_id = $1 OR tr.to_agency_id = $1)
            ORDER BY tr.requested_at DESC
        `, [agencyId]);
        return res.rows;
    } finally {
        client.release();
    }
}

export async function getAgencyPerformance(agencyId: string): Promise<AgentPerf[]> {
    const client = await dbPool.connect();
    try {
        const result = await client.query(`
          SELECT
            u.user_id,
            u.email,
            COALESCE(p.full_name, u.email)            AS agent_name,
            COALESCE(ag.points_balance, 0)            AS total_points,
            COALESCE(t.name, 'Bronze')                AS rank_label,
            COALESCE(t.commission_multiplier, 1.00)   AS commission_multiplier,
            COUNT(DISTINCT cl.client_id)              AS total_clients,
            COUNT(DISTINCT c.claim_id)                AS total_claims,
            COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status = 'APPROVED')  AS approved_claims,
            COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status = 'REJECTED')  AS rejected_claims,
            COUNT(DISTINCT c.claim_id) FILTER (WHERE c.status IN ('DRAFT','SUBMITTED')) AS pending_claims,
            COALESCE(SUM(c.total_amount) FILTER (WHERE c.status = 'APPROVED'), 0) AS total_approved_value,
            COALESCE(u.referral_points, 0)            AS referral_points,
            u.referral_code
          FROM public.app_user u
          LEFT JOIN public.user_person_link upl ON u.user_id = upl.user_id
          LEFT JOIN public.person p ON upl.person_id = p.person_id
          LEFT JOIN public.agent ag ON ag.agent_id = u.user_id
          LEFT JOIN public.tier t ON ag.current_tier_id = t.tier_id
          LEFT JOIN public.client cl ON cl.agent_id = u.user_id
          LEFT JOIN public.claim c ON c.assigned_agent_id = u.user_id
          WHERE u.role = 'agent' AND u.agency_id = $1
          GROUP BY
            u.user_id, u.email, p.full_name,
            ag.points_balance, t.name, t.commission_multiplier,
            u.referral_points, u.referral_code
          ORDER BY ag.points_balance DESC NULLS LAST, total_approved_value DESC
        `, [agencyId]);

        return result.rows;
    } finally {
        client.release();
    }
}

export async function getAgencyAgents(agencyId: string): Promise<AgencyAgent[]> {
    const client = await dbPool.connect();
    try {
        const res = await client.query(`
            SELECT 
                u.user_id,
                p.full_name,
                u.email,
                p.phone_number,
                u.status,
                u.approved_at as joined_at,
                (SELECT COUNT(*) FROM public.client c WHERE c.agent_id = u.user_id) as total_policies,
                (SELECT COUNT(*) FROM public.claim cl 
                 JOIN public.client c ON cl.client_id = c.client_id 
                 WHERE c.agent_id = u.user_id) as total_claims
            FROM app_user u
            JOIN user_person_link upl ON u.user_id = upl.user_id
            JOIN person p ON upl.person_id = p.person_id
            WHERE u.agency_id = $1 AND u.role = 'agent'
            ORDER BY p.full_name ASC
        `, [agencyId]);
        return res.rows.map(row => ({
            ...row,
            total_policies: parseInt(row.total_policies),
            total_claims: parseInt(row.total_claims)
        }));
    } finally {
        client.release();
    }
}

export async function getAgencyClients(agencyId: string): Promise<AgencyClient[]> {
    const client = await dbPool.connect();
    try {
        const res = await client.query(`
            SELECT 
                c.client_id,
                p.full_name,
                c.agent_id,
                ap.full_name as agent_name,
                (SELECT COUNT(*) FROM contract ct WHERE ct.client_id = c.client_id) as total_policies
            FROM client c
            JOIN person p ON c.person_id = p.person_id
            JOIN app_user au ON c.agent_id = au.user_id
            JOIN user_person_link upl ON au.user_id = upl.user_id
            JOIN person ap ON upl.person_id = ap.person_id
            WHERE au.agency_id = $1
            ORDER BY p.full_name ASC
        `, [agencyId]);

        return res.rows.map(row => ({
            ...row,
            total_policies: parseInt(row.total_policies)
        }));
    } finally {
        client.release();
    }
}

export async function reassignClient(clientId: string, newAgentId: string): Promise<void> {
    const client = await dbPool.connect();
    try {
        await client.query(`
            UPDATE client
            SET agent_id = $1, updated_at = NOW()
            WHERE client_id = $2
        `, [newAgentId, clientId]);
    } finally {
        client.release();
    }
}

export async function getAgencyClaims(agencyId: string): Promise<Claim[]> {
    const client = await dbPool.connect();
    try {
        const res = await client.query(`
            SELECT 
                c.claim_id,
                p.full_name as client_name,
                ct.contract_number as policy_number,
                c.claim_date,
                c.status,
                c.stage,
                c.total_amount,
                h.name as hospital_name,
                d.name as disease_name,
                c.notes
            FROM claim c
            JOIN client cl ON c.client_id = cl.client_id
            JOIN app_user u ON cl.agent_id = u.user_id
            JOIN person p ON cl.person_id = p.person_id
            LEFT JOIN contract ct ON c.contract_id = ct.contract_id
            LEFT JOIN hospital h ON c.hospital_id = h.hospital_id
            LEFT JOIN disease d ON c.disease_id = d.disease_id
            WHERE u.agency_id = $1
            ORDER BY c.updated_at DESC
        `, [agencyId]);

        return res.rows.map(row => ({
            ...row,
            claim_date: row.claim_date.toISOString(),
            total_amount: parseFloat(row.total_amount)
        }));
    } finally {
        client.release();
    }
}


export async function approveTransfer(requestId: string, adminUserId: string): Promise<void> {
    const client = await dbPool.connect();
    try {
        await client.query("BEGIN");

        // 1. Get the request details
        const reqRes = await client.query("SELECT agent_id, to_agency_id FROM agency_transfer_request WHERE request_id = $1 FOR UPDATE", [requestId]);
        if (reqRes.rows.length === 0) throw new Error("Request not found");
        const { agent_id, to_agency_id } = reqRes.rows[0];

        // 2. Update the request status
        await client.query(`
      UPDATE agency_transfer_request 
      SET status = 'APPROVED', reviewed_at = NOW(), reviewed_by = $2
      WHERE request_id = $1
    `, [requestId, adminUserId]);

        // 3. Update the agent's agency
        await client.query(`
      UPDATE app_user SET agency_id = $1 WHERE user_id = $2
    `, [to_agency_id, agent_id]); // Fixed param order: set agency_id = $1

        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally {
        client.release();
    }
}

export async function rejectTransfer(requestId: string, adminUserId: string): Promise<void> {
    const client = await dbPool.connect();
    try {
        await client.query(`
      UPDATE agency_transfer_request 
      SET status = 'REJECTED', reviewed_at = NOW(), reviewed_by = $2
      WHERE request_id = $1
    `, [requestId, adminUserId]);
    } finally {
        client.release();
    }
}
