
import { dbPool } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

export type ActivityItem = {
  id: string;
  type: "User Registration" | "Claim Submission" | "Policy Approval";
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
};

export async function getRecentActivity(): Promise<ActivityItem[]> {
  const client = await dbPool.connect();
  try {
    // 1. Get recent users
    const usersRes = await client.query(`
      SELECT 
        u.user_id, 
        u.created_at, 
        u.role,
        p.full_name
      FROM public.app_user u
      LEFT JOIN public.user_person_link upl ON u.user_id = upl.user_id
      LEFT JOIN public.person p ON upl.person_id = p.person_id
      ORDER BY u.created_at DESC 
      LIMIT 5
    `);

    // 2. Get recent claims
    const claimsRes = await client.query(`
      SELECT 
        c.claim_id, 
        c.created_at, 
        c.status,
        h.name as hospital_name
      FROM public.claim c
      LEFT JOIN public.hospital h ON c.hospital_id = h.hospital_id
      ORDER BY c.created_at DESC 
      LIMIT 5
    `);

    const activities: ActivityItem[] = [];

    // Process Users
    usersRes.rows.forEach((row) => {
      try {
          activities.push({
            id: row.user_id,
            type: "User Registration",
            title: "New user registered",
            description: `User '${row.full_name || row.role || 'Unknown'}' created an account.`,
            timestamp: row.created_at,
            timeAgo: row.created_at ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true }) : '',
          });
      } catch (e) {
        console.error("Error processing user activity row", row, e);
      }
    });

    // Process Claims
    claimsRes.rows.forEach((row) => {
      try {
          activities.push({
            id: row.claim_id,
            type: "Claim Submission",
            title: "Claim Submitted",
            description: `New claim from ${row.hospital_name || 'Unknown Hospital'}.`,
            timestamp: row.created_at,
            timeAgo: row.created_at ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true }) : '',
          });
      } catch (e) {
         console.error("Error processing claim activity row", row, e);
      }
    });

    // Sort by timestamp descending
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

  } finally {
    client.release();
  }
}
