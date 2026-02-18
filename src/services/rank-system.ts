
import { dbPool } from "@/lib/db";

export interface Tier {
    tier_id: string;
    name: string;
    min_points: number;
    commission_multiplier: number;
    cashback_rate: number;
}

export async function getTiers(): Promise<Tier[]> {
    const client = await dbPool.connect();
    try {
        const res = await client.query<Tier>(`
      SELECT * FROM public.tier ORDER BY min_points ASC
    `);
        return res.rows;
    } finally {
        client.release();
    }
}

export async function calculateTier(points: number, tiers: Tier[]): Promise<Tier | null> {
    // Find the highest tier where min_points <= points
    // Since tiers are sorted ASC, we can reverse or iterate carefully.
    // Best play: filter then pop relative to sorted.
    const applicable = tiers.filter(t => t.min_points <= points);
    return applicable.length > 0 ? applicable[applicable.length - 1] : null;
}

/**
 * Adds points to an agent and updates their rank/tier automatically.
 * Returns the new total points and new tier name.
 */
export async function addAgentPoints(agentId: string, pointsToAdd: number) {
    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get current agent data
        const agentRes = await client.query(`
      SELECT points_balance FROM public.agent WHERE agent_id = $1 FOR UPDATE
    `, [agentId]);

        if (agentRes.rows.length === 0) {
            throw new Error(`Agent ${agentId} not found`);
        }

        const currentPoints = agentRes.rows[0].points_balance || 0;
        const newPoints = currentPoints + pointsToAdd;

        // 2. Update points
        await client.query(`
      UPDATE public.agent SET points_balance = $1 WHERE agent_id = $2
    `, [newPoints, agentId]);

        // 3. Determine new tier
        const tiersRes = await client.query<Tier>(`
      SELECT * FROM public.tier ORDER BY min_points ASC
    `);
        const tiers = tiersRes.rows.map(t => ({
            ...t,
            min_points: Number(t.min_points)
        }));

        // Logic: Find highest tier with min_points <= newPoints
        const newTier = tiers.filter(t => t.min_points <= newPoints).pop();

        if (newTier) {
            // Update agent tier
            await client.query(`
         UPDATE public.agent SET current_tier_id = $1 WHERE agent_id = $2
       `, [newTier.tier_id, agentId]);
        }

        await client.query('COMMIT');

        return {
            points: newPoints,
            tier: newTier?.name
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
