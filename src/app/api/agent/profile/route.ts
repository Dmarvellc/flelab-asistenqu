import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findUserWithProfile } from "@/lib/auth-queries";

export async function GET() {
    const cookieStore = await cookies();
    const userId = cookieStore.get("app_user_id")?.value;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // We assume findUserWithProfile also returns null if not found
        const user = await findUserWithProfile(userId);

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Failed to fetch profile", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
