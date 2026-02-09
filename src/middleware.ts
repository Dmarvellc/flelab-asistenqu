import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Map of URL prefixes to required roles
const routeRoles: Record<string, string> = {
  '/developer': 'developer',
  '/agent': 'agent',
  '/hospital': 'hospital',
  '/admin-agency': 'admin_agency',
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

    // Case 1: User is on login page
    if (isLoginPage) {
      // If user is already logged in with the correct role, redirect to dashboard
      if (roleCookie === requiredRole) {
        return NextResponse.redirect(new URL(matchedPrefix, request.url))
      }
      // Otherwise, allow access to login page
      return NextResponse.next()
    }

    // Case 2: User is on a protected page (not login)
    // If user does not have the correct role, redirect to login
    if (roleCookie !== requiredRole) {
      return NextResponse.redirect(new URL(`${matchedPrefix}/login`, request.url))
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
