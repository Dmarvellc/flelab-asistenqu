import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_SESSION_COOKIE,
  clearLegacyAuthCookies,
  clearSessionCookie,
  revokeSession,
} from "@/lib/auth";

async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (sessionId) {
    await revokeSession(sessionId).catch(() => {});
  }
}

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  await revokeCurrentSession();
  clearLegacyAuthCookies(response);
  clearSessionCookie(response);

  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");

  // Determine redirect target
  let redirectUrl = "/login";
  let prefixToClear = "session_generic";

  if (from === "agent" || request.url.includes("/agent")) {
    redirectUrl = "/agent/login";
    prefixToClear = "session_agent";
  } else if (from === "hospital" || request.url.includes("/hospital")) {
    redirectUrl = "/hospital/login";
    prefixToClear = "session_hospital";
  } else if (from === "developer" || request.url.includes("/developer")) {
    redirectUrl = "/developer/login";
    prefixToClear = "session_developer";
  } else if (from === "admin-agency" || request.url.includes("/admin-agency")) {
    redirectUrl = "/admin-agency/login";
    prefixToClear = "session_admin_agency";
  }

  const response = NextResponse.redirect(new URL(redirectUrl, request.url));
  void prefixToClear;
  await revokeCurrentSession();
  clearLegacyAuthCookies(response);
  clearSessionCookie(response);

  return response;
}
