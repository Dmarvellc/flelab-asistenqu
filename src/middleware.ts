import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Map of URL prefixes to required roles
const routeRoles: Record<string, string> = {
  '/developer': 'developer',
  '/agent': 'agent',
  '/hospital': 'hospital_admin',
  '/admin-agency': 'agency_admin',
  '/insurance': 'insurance_admin',
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const roleCookie = request.cookies.get('rbac_role')?.value

  // Find if current path matches any role prefix
  const matchedPrefix = Object.keys(routeRoles).find(prefix => path.startsWith(prefix))

  if (matchedPrefix) {
    const requiredRole = routeRoles[matchedPrefix]
    const isLoginPage = path === `${matchedPrefix}/login`
    const isRegisterPage = path === `${matchedPrefix}/register`
    // Allow public access to login and register pages
    const isPublicPage = isLoginPage || isRegisterPage

    if (isPublicPage) {
      // If user is already logged in with the correct role, redirect to dashboard
      // Only redirect if they are on the login page specifically to avoid redirect loops or annoyance
      if (isLoginPage && roleCookie === requiredRole) {
        return NextResponse.redirect(new URL(matchedPrefix, request.url))
      }
      // Otherwise, allow access
      return NextResponse.next()
    }

    // Case 2: User is on a protected page
    // If user does not have the correct role, redirect to login
    if (roleCookie !== requiredRole) {
      return NextResponse.redirect(new URL(`${matchedPrefix}/login`, request.url))
    }

    // Special Case: Agent with PENDING status (Needs Verification)
    const userStatus = request.cookies.get('user_status')?.value
    if (requiredRole === 'agent' && userStatus === 'PENDING') {
      const allowedPendingPaths = ['/agent/verification', '/agent/settings']
      const isAllowedPath = allowedPendingPaths.some(p => path.startsWith(p))

      if (!isAllowedPath) {
        return NextResponse.redirect(new URL('/agent/verification', request.url))
      }
    }
  }

  return NextResponse.next()
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
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
