import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/auth-queries";
import { getRoleFromCookies } from "@/lib/auth-cookies";
import { getRecentActivity, ActivityItem } from "@/services/activity";
import { cached, TTL } from "@/lib/cache";

const allowed = new Set(["developer", "super_admin"]);

export async function GET() {
    const role = await getRoleFromCookies();
    if (!role || !allowed.has(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const payload = await cached<{ stats: ReturnType<typeof getSystemStats> extends Promise<infer T> ? T : never; activities: ActivityItem[] }>(
            "v1:developer:stats:dashboard",
            TTL.SHORT,
            async () => {
                const [stats, activities] = await Promise.all([
                    getSystemStats(),
                    getRecentActivity().catch(() => [] as ActivityItem[]),
                ]);
                return { stats, activities };
            }
        );

        const { stats, activities } = payload;
        return NextResponse.json({ stats: { ...stats, activities } });
    } catch (error) {
        console.error("Failed to load stats", error);
        return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }
}
