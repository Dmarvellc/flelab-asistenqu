import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/auth-queries";
import { getRoleFromCookies } from "@/lib/auth-cookies";
import { getRecentActivity, ActivityItem } from "@/services/activity";

const allowed = new Set(["developer", "super_admin"]);

export async function GET() {
    const role = await getRoleFromCookies();
    if (!role || !allowed.has(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        console.log("Fetching system stats...");
        const stats = await getSystemStats();
        console.log("System stats fetched:", stats);

        console.log("Fetching recent activity...");
        let activities: ActivityItem[] = [];
        try {
            activities = await getRecentActivity();
            console.log("Recent activity fetched:", activities);
        } catch (actError) {
             console.error("Failed to fetch recent activity", actError);
        }
        
        return NextResponse.json({ stats: { ...stats, activities } });
    } catch (error) {
        console.error("Failed to load stats", error);
        return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }
}
