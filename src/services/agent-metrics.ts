import { dbPool } from "@/lib/db";

export interface AgentChartData {
  name: string;
  claims: number;
  clients: number;
}

export interface AgentMetrics {
  activeClients: number;
  pendingContracts: number;
  points: number;
  totalClaims: number;
  chartData: AgentChartData[];
}

/**
 * Fetch agent dashboard metrics.
 * All queries use user_id == agent_id (same UUID in this schema).
 * Each query is isolated so one failure doesn't kill the entire dashboard.
 */
export async function getAgentMetrics(userId: string): Promise<AgentMetrics> {
  const client = await dbPool.connect();
  try {
    const [clientsRes, pendingRes, agentRes, claimsRes, chartRes] = await Promise.all([
      // 1. Active clients where this user is the agent
      client.query(
        `SELECT COUNT(*) AS count
         FROM public.client
         WHERE agent_id = $1 AND status = 'ACTIVE'`,
        [userId]
      ).catch(() => ({ rows: [{ count: "0" }] })),

      // 2. Pending contracts for clients assigned to this agent
      client.query(
        `SELECT COUNT(*) AS count
         FROM public.contract con
         JOIN public.client c ON con.client_id = c.client_id
         WHERE c.agent_id = $1 AND con.status = 'PENDING'`,
        [userId]
      ).catch(() => ({ rows: [{ count: "0" }] })),

      // 3. Agent points (agent_id == user_id in this schema)
      client.query(
        `SELECT points_balance
         FROM public.agent
         WHERE agent_id = $1
         LIMIT 1`,
        [userId]
      ).catch(() => ({ rows: [] })),

      // 4. Total claims assigned to or created by this agent
      client.query(
        `SELECT COUNT(*) AS count
         FROM public.claim
         WHERE assigned_agent_id = $1
            OR created_by_user_id = $1`,
        [userId]
      ).catch(() => ({ rows: [{ count: "0" }] })),

      // 5. Monthly chart data for the last 6 months
      client.query(
        `WITH months AS (
          SELECT date_trunc('month', NOW() - (s.a || ' months')::interval) AS month
          FROM generate_series(5, 0, -1) AS s(a)
         )
         SELECT 
           to_char(m.month, 'Mon') as name,
           COUNT(DISTINCT c.claim_id) as claims,
           COUNT(DISTINCT cl.client_id) as clients
         FROM months m
         LEFT JOIN public.claim c 
           ON date_trunc('month', c.created_at) = m.month 
           AND (c.assigned_agent_id = $1 OR c.created_by_user_id = $1)
         LEFT JOIN public.client cl 
           ON date_trunc('month', cl.created_at) = m.month 
           AND cl.agent_id = $1
         GROUP BY m.month
         ORDER BY m.month;`,
        [userId]
      ).catch(() => ({ rows: [] })),
    ]);

    const defaultChartData = [
      { name: "Jan", claims: 0, clients: 0 },
      { name: "Feb", claims: 0, clients: 0 },
      { name: "Mar", claims: 0, clients: 0 },
      { name: "Apr", claims: 0, clients: 0 },
      { name: "May", claims: 0, clients: 0 },
      { name: "Jun", claims: 0, clients: 0 },
    ];

    return {
      activeClients: parseInt(clientsRes.rows[0]?.count ?? "0", 10),
      pendingContracts: parseInt(pendingRes.rows[0]?.count ?? "0", 10),
      points: agentRes.rows[0]?.points_balance ?? 0,
      totalClaims: parseInt(claimsRes.rows[0]?.count ?? "0", 10),
      chartData: chartRes.rows.length > 0 ? chartRes.rows.map(row => ({
        name: row.name,
        claims: Number(row.claims),
        clients: Number(row.clients)
      })) : defaultChartData
    };
  } finally {
    client.release();
  }
}
