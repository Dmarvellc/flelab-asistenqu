import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearLegacyAuthCookies,
  clearSessionCookie,
  getPortalCookieName,
  revokeSession,
} from "@/lib/auth";

export async function POST() {
    const cookieStore = await cookies();
    const portalCookie = getPortalCookieName("agent");
    const sessionId = portalCookie ? cookieStore.get(portalCookie)?.value : null;
    if (sessionId) {
        await revokeSession(sessionId).catch(() => {});
    }

    const response = NextResponse.json({ success: true });
    clearLegacyAuthCookies(response);
    clearSessionCookie(response, "agent");
    return response;
}
