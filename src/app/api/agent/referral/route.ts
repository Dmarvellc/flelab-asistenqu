import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET() {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get("app_user_id")?.value;
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get referral code
        const userRes = await client.query(
            "SELECT referral_code, referral_points FROM public.app_user WHERE user_id = $1",
            [userId]
        );

        if (userRes.rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { referral_code, referral_points } = userRes.rows[0];

        // Get referral stats
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

        // Get recent referrals
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

        return NextResponse.json({
            referral_code: referral_code || null,
            referral_points: referral_points || 0,
            stats: statsRes.rows[0],
            recent_referrals: recentRes.rows,
        });
    } catch (e) {
        console.error("GET referral error", e);
        return NextResponse.json({ error: "Failed to fetch referral data" }, { status: 500 });
    } finally {
        client.release();
    }
}
