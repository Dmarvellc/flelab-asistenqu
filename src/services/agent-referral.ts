import { dbPool } from "@/lib/db";

export async function getAgentReferralData(userId: string) {
    const client = await dbPool.connect();
    try {
        const userRes = await client.query(
            "SELECT referral_code, referral_points FROM public.app_user WHERE user_id = $1",
            [userId]
        );

        if (userRes.rows.length === 0) {
            return null;
        }

        const { referral_code, referral_points } = userRes.rows[0];

        const statsRes = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'CREDITED') AS credited_count,
                COUNT(*) FILTER (WHERE status = 'PENDING')  AS pending_count,
                COUNT(*) AS total_referrals,
                COALESCE(SUM(reward_amount) FILTER (WHERE status = 'CREDITED'), 0) AS total_earned_rupiah,
                COALESCE(SUM(reward_points)  FILTER (WHERE status = 'CREDITED'), 0) AS total_earned_points
            FROM public.referral_reward
            WHERE referrer_user_id = $1
        `, [userId]);

        const recentRes = await client.query(`
            SELECT 
                rr.reward_id,
                rr.reward_amount,
                rr.reward_points,
                rr.status,
                rr.created_at,
                u.email AS referred_email
            FROM public.referral_reward rr
            JOIN public.app_user u ON rr.referred_user_id = u.user_id
            WHERE rr.referrer_user_id = $1
            ORDER BY rr.created_at DESC
            LIMIT 20
        `, [userId]);

        return {
            referral_code: referral_code || null,
            referral_points: referral_points || 0,
            stats: statsRes.rows[0],
            recent_referrals: recentRes.rows,
        };
    } finally {
        client.release();
    }
}
