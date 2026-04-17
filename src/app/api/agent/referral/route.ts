import { getAgentUserIdFromCookies } from "@/lib/auth-cookies";
import { NextResponse } from "next/server";
import { dbPool } from "@/lib/db";
import { cookies } from "next/headers";
import crypto from "crypto";

function generateReferralCode() {
    return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export async function GET() {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = await getAgentUserIdFromCookies();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get referral code (fallback to agent table if not in app_user, since we did a migration)
        const userRes = await client.query(
            "SELECT referral_code, referral_points FROM public.app_user WHERE user_id = $1",
            [userId]
        );

        let code = null;
        let points = 0;
        let wallet = 0;

        if (userRes.rows.length > 0) {
            code = userRes.rows[0].referral_code;
            points = userRes.rows[0].referral_points || 0;
        }

        // Also check agent table if we just migrated
        const agentRes = await client.query("SELECT referral_code, wallet_balance FROM public.agent WHERE agent_id = $1", [userId]);
        if (agentRes.rows.length > 0) {
            if (!code) code = agentRes.rows[0].referral_code;
            wallet = agentRes.rows[0].wallet_balance || 0;
        }

        // We check if referral_reward exists
        let statsRes = null;
        let recentRes = null;
        try {
            statsRes = await client.query(`
              SELECT 
                COUNT(*) FILTER (WHERE status = 'CREDITED') AS credited_count,
                COUNT(*) FILTER (WHERE status = 'PENDING')  AS pending_count,
                COUNT(*) AS total_referrals,
                COALESCE(SUM(reward_amount) FILTER (WHERE status = 'CREDITED'), 0) AS total_earned_rupiah,
                COALESCE(SUM(reward_points)  FILTER (WHERE status = 'CREDITED'), 0) AS total_earned_points
              FROM public.referral_reward
              WHERE referrer_user_id = $1
            `, [userId]);

            recentRes = await client.query(`
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
        } catch (e) {
            // table might not exist
        }
        
        // Also check referral_history if it exists from migration
        let historyFromAgent = [];
        try {
            const hRes = await client.query(`
               SELECT h.id as reward_id, h.reward_amount, 0 as reward_points, 'CREDITED' as status, h.created_at, p.full_name as referred_email
               FROM public.referral_history h
               JOIN public.app_user u ON h.referred_user_id = u.user_id
               LEFT JOIN public.user_person_link up ON u.user_id = up.user_id
               LEFT JOIN public.person p ON up.person_id = p.person_id
               WHERE h.referrer_id = $1
            `, [userId]);
            historyFromAgent = hRes.rows;
        } catch(e) {}

        const recent_referrals = [
            ...(recentRes ? recentRes.rows : []),
            ...historyFromAgent
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const stats = statsRes ? statsRes.rows[0] : { total_referrals: 0, total_earned_rupiah: 0 };
        // Combine stats
        stats.total_referrals = parseInt(stats.total_referrals || 0) + historyFromAgent.length;
        stats.total_earned_rupiah = parseInt(stats.total_earned_rupiah || 0) + wallet;

        return NextResponse.json({
            referral_code: code || null,
            referral_points: points || 0,
            wallet_balance: wallet || 0,
            stats: stats,
            recent_referrals: recent_referrals,
        });
    } catch (e) {
        console.error("GET referral error", e);
        return NextResponse.json({ error: "Failed to fetch referral data" }, { status: 500 });
    } finally {
        client.release();
    }
}

export async function POST() {
    const client = await dbPool.connect();
    try {
        const cookieStore = await cookies();
        const userId = await getAgentUserIdFromCookies();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Generate a unique code
        let newCode = "";
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
            newCode = generateReferralCode();
            // check in app_user
            let existRes = undefined;
            try {
                existRes = await client.query("SELECT user_id FROM public.app_user WHERE referral_code = $1", [newCode]);
            } catch (e) {
                // column might not exist
            }
            // check in agent
            const existAgentRes = await client.query("SELECT agent_id FROM public.agent WHERE referral_code = $1", [newCode]);
            
            if ((!existRes || existRes.rows.length === 0) && existAgentRes.rows.length === 0) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return NextResponse.json({ error: "Failed to generate unique code" }, { status: 500 });
        }

        // Save code to agent level
        await client.query("UPDATE public.agent SET referral_code = $1 WHERE agent_id = $2", [newCode, userId]);
        // Try saving to app_user as well
        try {
             await client.query("UPDATE public.app_user SET referral_code = $1 WHERE user_id = $2", [newCode, userId]);
        } catch (e) {}

        return NextResponse.json({ referral_code: newCode });
    } catch (e) {
        console.error("POST generate referral code error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    } finally {
        client.release();
    }
}
