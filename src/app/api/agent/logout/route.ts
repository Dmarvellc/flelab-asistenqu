import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_SESSION_COOKIE,
  clearLegacyAuthCookies,
  clearSessionCookie,
  revokeSession,
} from "@/lib/auth";

export async function POST() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    if (sessionId) {
        await revokeSession(sessionId).catch(() => {});
    }

    const response = NextResponse.json({ success: true });
    clearLegacyAuthCookies(response);
    clearSessionCookie(response);
    return response;
}
