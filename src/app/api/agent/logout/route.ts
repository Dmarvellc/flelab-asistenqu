import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete("session_agent_role");
    cookieStore.delete("session_agent_user_id");
    cookieStore.delete("session_agent_status");
    cookieStore.delete("app_user_id");
    cookieStore.delete("rbac_role");
    cookieStore.delete("user_status");
    return NextResponse.json({ success: true });
}
