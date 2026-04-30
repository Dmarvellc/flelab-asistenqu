import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  clearLegacyAuthCookies,
  clearSessionCookie,
  getPortalCookieName,
  revokeSession,
} from "@/lib/auth";

const PATH_TO_PORTAL: Array<{ match: string; portal: string; loginPath: string }> = [
  { match: "/agent",         portal: "agent",         loginPath: "/agent/login" },
  { match: "/hospital",      portal: "hospital",      loginPath: "/hospital/login" },
  { match: "/developer",     portal: "developer",     loginPath: "/developer/login" },
  { match: "/admin-agency",  portal: "admin_agency",  loginPath: "/admin-agency/login" },
];

const FROM_TO_PORTAL: Record<string, { portal: string; loginPath: string }> = {
  agent: { portal: "agent", loginPath: "/agent/login" },
  hospital: { portal: "hospital", loginPath: "/hospital/login" },
  developer: { portal: "developer", loginPath: "/developer/login" },
  "admin-agency": { portal: "admin_agency", loginPath: "/admin-agency/login" },
};

async function resolvePortalContext(request: Request, fromParam?: string | null) {
  if (fromParam && FROM_TO_PORTAL[fromParam]) return FROM_TO_PORTAL[fromParam];

  // Try to derive from Referer header (browser-initiated logout link)
  const headerStore = await headers();
  const referer = headerStore.get("referer") || "";
  for (const entry of PATH_TO_PORTAL) {
    if (referer.includes(entry.match)) {
      return { portal: entry.portal, loginPath: entry.loginPath };
    }
  }

  // Last resort — match against current request URL
  const url = request.url;
  for (const entry of PATH_TO_PORTAL) {
    if (url.includes(entry.match)) {
      return { portal: entry.portal, loginPath: entry.loginPath };
    }
  }
  return null;
}

async function revokePortalSession(portal: string) {
  const cookieStore = await cookies();
  const cookieName = getPortalCookieName(portal);
  if (!cookieName) return;
  const sessionId = cookieStore.get(cookieName)?.value;
  if (sessionId) {
    await revokeSession(sessionId).catch(() => {});
  }
}

export async function POST(request: Request) {
  const ctx = await resolvePortalContext(request, null);
  const response = NextResponse.json({ ok: true });

  if (ctx) {
    await revokePortalSession(ctx.portal);
    clearSessionCookie(response, ctx.portal);
  } else {
    // Unknown context — clear everything as a safe fallback
    clearSessionCookie(response);
  }
  clearLegacyAuthCookies(response);
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const ctx = await resolvePortalContext(request, from);

  const redirectUrl = ctx?.loginPath ?? "/login";
  const response = NextResponse.redirect(new URL(redirectUrl, request.url));

  if (ctx) {
    await revokePortalSession(ctx.portal);
    clearSessionCookie(response, ctx.portal);
  } else {
    clearSessionCookie(response);
  }
  clearLegacyAuthCookies(response);
  return response;
}
