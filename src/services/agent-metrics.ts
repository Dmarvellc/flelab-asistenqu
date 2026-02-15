import { dbPool } from "@/lib/db";

export interface AgentMetrics {
  activeClients: number;
  pendingContracts: number;
  points: number;
  totalClaims: number;
}

export async function getAgentMetrics(userId: string): Promise<AgentMetrics> {
  const client = await dbPool.connect();
  try {
    // 1. Total Active Clients
    const clientsRes = await client.query(`
      SELECT COUNT(*) as count FROM public.client 
      WHERE agent_id = $1 AND status = 'ACTIVE'
    `, [userId]);
    const activeClients = parseInt(clientsRes.rows[0].count);

    // 2. Pending Contracts (Polis Pending)
    const pendingContractsRes = await client.query(`
      SELECT COUNT(*) as count 
      FROM public.contract con
      JOIN public.client c ON con.client_id = c.client_id
      WHERE c.agent_id = $1 AND con.status = 'PENDING'
    `, [userId]);
    
    const pendingContracts = parseInt(pendingContractsRes.rows[0].count);

    // 3. Points Balance (Komisi / Poin)
    const agentRes = await client.query(`
      SELECT points_balance FROM public.agent WHERE agent_id = $1
    `, [userId]);
    
    let points = 0;
    if (agentRes.rows.length > 0) {
        points = agentRes.rows[0].points_balance;
    }

    // 4. Total Claims (submitted/approved)
    const claimsRes = await client.query(`
        SELECT COUNT(*) as count FROM public.claim WHERE assigned_agent_id = $1
    `, [userId]);
    const totalClaims = parseInt(claimsRes.rows[0].count);

    return {
      activeClients,
      pendingContracts,
      points,
      totalClaims
    };
  } finally {
    client.release();
  }
}
