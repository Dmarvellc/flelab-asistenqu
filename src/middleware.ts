import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllowedRolesForPath, Role } from './lib/rbac'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const roleCookie = request.cookies.get('rbac_role')?.value

  // Check if current path requires specific roles
  const allowedRoles = getAllowedRolesForPath(path)

  if (allowedRoles) {
    const isLoginPage = path.endsWith('/login')
    const isRegisterPage = path.endsWith('/register')
    // Allow public access to login and register pages
    const isPublicPage = isLoginPage || isRegisterPage

    if (isPublicPage) {
      // If user is already logged in with an allowed role, redirect to dashboard
      // We need to find the base prefix to redirect to
      // Simple heuristic: remove /login or /register from path
      if (roleCookie && allowedRoles.includes(roleCookie as Role)) {
         const dashboardPath = path.replace(/\/login$|\/register$/, '')
         return NextResponse.redirect(new URL(dashboardPath, request.url))
      }
      // Otherwise, allow access
      return NextResponse.next()
    }

    // Case 2: User is on a protected page
    // If user does not have an allowed role, redirect to login
    // We need to find the login path. 
    // Heuristic: If path is /admin-agency/dashboard, login is /admin-agency/login[
    
    if (!roleCookie || !allowedRoles.includes(roleCookie as Role)) {
      // Construct login URL. 
      // Getting the module root is tricky without the map.
      // But we can assume standard structure: /{module}/login
      const segments = path.split('/').filter(Boolean);
      const moduleRoot = segments.length > 0 ? `/${segments[0]}` : '/';
      
      return NextResponse.redirect(new URL(`${moduleRoot}/login`, request.url))
    }

    // Special Case: Agent with PENDING status (Needs Verification)
    const userStatus = request.cookies.get('user_status')?.value
    if (roleCookie === 'agent' && userStatus === 'PENDING') {
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
