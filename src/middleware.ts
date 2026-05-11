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
  users: "developer", // /api/users is developer-only; pin to developer portal cookie
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

  // For page routes, inject x-portal and x-pathname headers.
  // Auth enforcement is handled in Server Components (Layouts/Pages).
  // x-pathname lets layouts skip auth for login/register routes.
  const portal = derivePortalFromPath(path);
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("x-pathname", path);
  if (portal) reqHeaders.set("x-portal", portal);
  return NextResponse.next({ request: { headers: reqHeaders } });
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
