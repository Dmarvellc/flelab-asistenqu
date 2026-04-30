import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAllowedRolesForPath } from "./lib/rbac";

/**
 * Per-portal session cookies. Each portal has its own cookie so a user can be
 * logged in to multiple portals at once (e.g. developer in one tab, agent in
 * another) without one session overwriting the other.
 */
const PORTAL_COOKIE_NAMES: Record<string, string> = {
  agent: "session_agent",
  hospital: "session_hospital",
  developer: "session_developer",
  admin_agency: "session_admin_agency",
};

/**
 * Map route prefix → portal value stored in auth_session.
 * Must match the "portal" enum sent by each login page.
 */
const ROUTE_TO_PORTAL: Record<string, string> = {
  agent: "agent",
  hospital: "hospital",
  developer: "developer",
  "admin-agency": "admin_agency",
};

/**
 * Known static route prefixes (NOT agency slugs).
 */
const KNOWN_PREFIXES = new Set([
  "agent", "hospital", "developer", "admin-agency",
  "api", "_next", "favicon.ico", "status",
]);

const LEGACY_AUTH_COOKIE = "session_id";

function readPortalSession(request: NextRequest, portal: string | null | undefined) {
  if (!portal) return null;
  const cookieName = PORTAL_COOKIE_NAMES[portal];
  if (!cookieName) return null;
  const value = request.cookies.get(cookieName)?.value;
  return value || null;
}

/**
 * Derive the portal a request belongs to from its URL.
 * Works for both page routes (/agent/...) and API routes (/api/agent/...).
 */
function derivePortalFromPath(path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  if (segments[0] === "api" && segments.length >= 2) {
    const apiPrefix = segments[1];
    return ROUTE_TO_PORTAL[apiPrefix] ?? null;
  }
  return ROUTE_TO_PORTAL[segments[0]] ?? null;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Inject `x-portal` header on API requests so route handlers' getSession()
  // can pick the correct portal-specific cookie. We don't enforce auth here
  // — RBAC stays inside the route handler — we just label the request.
  if (path.startsWith("/api/")) {
    const apiPortal = derivePortalFromPath(path);
    if (apiPortal) {
      const headers = new Headers(request.headers);
      headers.set("x-portal", apiPortal);
      return NextResponse.next({ request: { headers } });
    }
    return NextResponse.next();
  }

  // Check if current path requires specific roles
  const allowedRoles = getAllowedRolesForPath(path);

  if (!allowedRoles) {
    return NextResponse.next();
  }

  const isLoginPage = path.endsWith("/login");
  const isRegisterPage = path.endsWith("/register");
  const isPublicPage = isLoginPage || isRegisterPage;

  const forceLogin = request.nextUrl.searchParams.get("force") === "true";

  // Determine which portal this route belongs to
  const segments = path.split("/").filter(Boolean);
  const routePrefix = segments[0] || "";

  // Check if this is a dynamic agency slug route: /{agencySlug}/agent/...
  const isDynamicAgentRoute = !KNOWN_PREFIXES.has(routePrefix) && segments.length >= 2 && segments[1] === "agent";
  const expectedPortal = isDynamicAgentRoute ? "agent" : ROUTE_TO_PORTAL[routePrefix];

  // Read the session FOR THIS PORTAL only — other portal sessions are ignored
  // here so they never trigger cross-portal redirects.
  const portalSessionId = readPortalSession(request, expectedPortal);
  // Legacy single-cookie fallback (pre-migration users still mid-session)
  const legacySessionId = request.cookies.get(LEGACY_AUTH_COOKIE)?.value;
  const hasSessionForThisPortal = Boolean(portalSessionId);

  if (isPublicPage) {
    if (forceLogin) {
      // Inject portal header so downstream getSession() can find the right cookie
      const headers = new Headers(request.headers);
      if (expectedPortal) headers.set("x-portal", expectedPortal);
      return NextResponse.next({ request: { headers } });
    }

    // Only bounce away from the login page if the user has a session FOR
    // THIS portal. If they're logged in elsewhere (e.g. developer) and
    // visit /agent/login, let them sign in to agent without disruption —
    // that's the whole point of multi-portal login.
    if (hasSessionForThisPortal) {
      if (isDynamicAgentRoute) {
        return NextResponse.redirect(new URL(`/${routePrefix}/agent`, request.url));
      }
      const dashboardPath = path.replace(/\/login$|\/register$/, "");
      return NextResponse.redirect(new URL(dashboardPath, request.url));
    }

    const headers = new Headers(request.headers);
    if (expectedPortal) headers.set("x-portal", expectedPortal);
    return NextResponse.next({ request: { headers } });
  }

  // Protected page — must have session for THIS portal
  if (!hasSessionForThisPortal && !legacySessionId) {
    if (isDynamicAgentRoute) {
      return NextResponse.redirect(
        new URL(`/${routePrefix}/agent/login`, request.url)
      );
    }
    const moduleRoot = segments.length > 0 ? `/${segments[0]}` : "/";
    return NextResponse.redirect(
      new URL(`${moduleRoot}/login`, request.url)
    );
  }

  // For dynamic agent routes, also verify the session's agency slug matches the URL slug
  if (isDynamicAgentRoute) {
    const sessionAgencySlug =
      request.cookies.get("session_agency_slug_agent")?.value ||
      request.cookies.get("session_agency_slug")?.value; // legacy fallback
    if (sessionAgencySlug && sessionAgencySlug !== routePrefix) {
      return NextResponse.redirect(
        new URL(`/${sessionAgencySlug}/agent`, request.url)
      );
    }
  }

  // Inject portal header so route handlers' getSession() picks the right cookie
  const headers = new Headers(request.headers);
  if (expectedPortal) headers.set("x-portal", expectedPortal);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
