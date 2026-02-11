import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/auth-queries";
import { getRoleFromCookies } from "@/lib/auth-cookies";

const allowed = new Set(["developer", "super_admin"]);

export async function GET() {
    const role = await getRoleFromCookies();
    if (!role || !allowed.has(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const stats = await getSystemStats();
        return NextResponse.json({ stats });
    } catch (error) {
        console.error("Failed to load stats", error);
        return NextResponse.json({ error: "Failed to load" }, { status: 500 });
    }
}
