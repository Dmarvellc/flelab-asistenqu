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
  const expectedPortal = ROUTE_TO_PORTAL[routePrefix];

  if (isPublicPage) {
    if (hasSession && sessionId) {
      // Verify that the session's portal matches this login page's portal.
      // We read the portal from a lightweight cookie instead of hitting DB in middleware.
      const sessionPortal = request.cookies.get("session_portal")?.value;

      if (sessionPortal && sessionPortal === expectedPortal) {
        // Session matches this portal — redirect to dashboard
        const dashboardPath = path.replace(/\/login$|\/register$/, "");
        return NextResponse.redirect(new URL(dashboardPath, request.url));
      }

      // Session is for a different portal — let them access this login page
      // (they can log in with a different account for this portal)
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // Protected page — must have session
  if (!hasSession) {
    const moduleRoot = segments.length > 0 ? `/${segments[0]}` : "/";
    return NextResponse.redirect(
      new URL(`${moduleRoot}/login`, request.url)
    );
  }

  // Verify portal match: the session must belong to this portal
  const sessionPortal = request.cookies.get("session_portal")?.value;

  if (expectedPortal && sessionPortal && sessionPortal !== expectedPortal) {
    // Session belongs to a different portal — redirect to this portal's login
    const moduleRoot = `/${segments[0]}`;
    return NextResponse.redirect(
      new URL(`${moduleRoot}/login`, request.url)
    );
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
