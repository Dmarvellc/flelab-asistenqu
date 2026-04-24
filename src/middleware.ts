import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAllowedRolesForPath } from "./lib/rbac";

const AUTH_SESSION_COOKIE = "session_id";

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
 * Where to send a user whose session.portal doesn't match the URL portal.
 * Used when a logged-in user accidentally navigates to a portal they don't
 * belong to — we gently bounce them to their actual dashboard.
 */
const PORTAL_TO_DASHBOARD: Record<string, string> = {
  agent: "/agent",
  hospital: "/hospital",
  developer: "/developer",
  admin_agency: "/admin-agency",
};

/**
 * Known static route prefixes (NOT agency slugs).
 */
const KNOWN_PREFIXES = new Set([
  "agent", "hospital", "developer", "admin-agency",
  "api", "_next", "favicon.ico", "status",
]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if current path requires specific roles
  const allowedRoles = getAllowedRolesForPath(path);

  if (!allowedRoles) {
    return NextResponse.next();
  }

  const isLoginPage = path.endsWith("/login");
  const isRegisterPage = path.endsWith("/register");
  const isPublicPage = isLoginPage || isRegisterPage;

  const sessionId = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  const hasSession = Boolean(sessionId);

  // Determine which portal this route belongs to
  const segments = path.split("/").filter(Boolean);
  const routePrefix = segments[0] || "";

  // Check if this is a dynamic agency slug route: /{agencySlug}/agent/...
  const isDynamicAgentRoute = !KNOWN_PREFIXES.has(routePrefix) && segments.length >= 2 && segments[1] === "agent";
  const expectedPortal = isDynamicAgentRoute ? "agent" : ROUTE_TO_PORTAL[routePrefix];

  if (isPublicPage) {
    if (hasSession && sessionId) {
      const sessionPortal = request.cookies.get("session_portal")?.value;

      if (sessionPortal && sessionPortal === expectedPortal) {
        // For dynamic routes, redirect to /{slug}/agent (dashboard)
        if (isDynamicAgentRoute) {
          const dashboardPath = `/${routePrefix}/agent`;
          return NextResponse.redirect(new URL(dashboardPath, request.url));
        }
        // Static route — redirect to dashboard
        const dashboardPath = path.replace(/\/login$|\/register$/, "");
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }

      // Logged-in user is on the WRONG portal's login page.
      // Send them to their own dashboard so they don't get stuck.
      if (sessionPortal && PORTAL_TO_DASHBOARD[sessionPortal]) {
        const dest = PORTAL_TO_DASHBOARD[sessionPortal];
        if (!path.startsWith(dest)) {
          return NextResponse.redirect(new URL(dest, request.url));
        }
      }

      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Protected page — must have session
  if (!hasSession) {
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

  // Verify portal match: the session must belong to this portal
  const sessionPortal = request.cookies.get("session_portal")?.value;

  if (expectedPortal && sessionPortal && sessionPortal !== expectedPortal) {
    // User is logged in but browsing a portal that doesn't match their role.
    // Bounce them to their own dashboard instead of a login loop.
    const ownDashboard = PORTAL_TO_DASHBOARD[sessionPortal];
    if (ownDashboard) {
      return NextResponse.redirect(new URL(ownDashboard, request.url));
    }
    if (isDynamicAgentRoute) {
      return NextResponse.redirect(
        new URL(`/${routePrefix}/agent/login`, request.url)
      );
    }
    const moduleRoot = `/${segments[0]}`;
    return NextResponse.redirect(
      new URL(`${moduleRoot}/login`, request.url)
    );
  }

  // For dynamic agent routes, also verify the session's agency slug matches the URL slug
  if (isDynamicAgentRoute) {
    const sessionAgencySlug = request.cookies.get("session_agency_slug")?.value;
    if (sessionAgencySlug && sessionAgencySlug !== routePrefix) {
      // Redirect to the correct agency's agent dashboard
      return NextResponse.redirect(
        new URL(`/${sessionAgencySlug}/agent`, request.url)
      );
    }
  }

  return NextResponse.next();
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
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
