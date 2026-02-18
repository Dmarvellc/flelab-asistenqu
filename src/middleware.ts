import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllowedRolesForPath, Role } from './lib/rbac'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const params = request.nextUrl.searchParams

  // Check if current path requires specific roles
  const allowedRoles = getAllowedRolesForPath(path)

  if (allowedRoles) {
    const isLoginPage = path.endsWith('/login')
    const isRegisterPage = path.endsWith('/register')
    const isPublicPage = isLoginPage || isRegisterPage

    // Helper to find valid role from cookies
    let roleCookie: string | undefined;
    let userStatus: string | undefined;

    // Check cookies based on what roles are allowed (Context-aware check)
    // 1. Super Admin (Global)
    if (request.cookies.get('session_super_admin_role')?.value === 'super_admin') {
      roleCookie = 'super_admin';
      userStatus = request.cookies.get('session_super_admin_status')?.value;
    }
    // 2. Agent Context
    else if (allowedRoles.includes('agent') || allowedRoles.includes('agent_manager')) {
      const r = request.cookies.get('session_agent_role')?.value;
      if (r && ['agent', 'agent_manager'].includes(r)) {
        roleCookie = r;
        userStatus = request.cookies.get('session_agent_status')?.value;
      }
    }
    // 3. Hospital Context
    else if (allowedRoles.includes('hospital_admin')) {
      const r = request.cookies.get('session_hospital_role')?.value;
      if (r === 'hospital_admin') {
        roleCookie = r;
        userStatus = request.cookies.get('session_hospital_status')?.value;
      }
    }
    // 4. Developer Context
    else if (allowedRoles.includes('developer')) {
      const r = request.cookies.get('session_developer_role')?.value;
      if (r === 'developer') {
        roleCookie = r;
        userStatus = request.cookies.get('session_developer_status')?.value;
      }
    }
    // 5. Admin Agency Context
    else if (allowedRoles.includes('admin_agency') || allowedRoles.includes('insurance_admin')) {
      const r = request.cookies.get('session_admin_agency_role')?.value;
      if (r && ['admin_agency', 'insurance_admin'].includes(r)) {
        roleCookie = r;
        userStatus = request.cookies.get('session_admin_agency_status')?.value;
      }
    }

    // Also check generic/legacy rbac_role just in case (optional, but good for transition)
    if (!roleCookie && request.cookies.get('rbac_role')?.value) {
      // We only honor this if it matches an allowed role, to prevent crossover
      const legacy = request.cookies.get('rbac_role')?.value;
      if (legacy && allowedRoles.includes(legacy as Role)) {
        roleCookie = legacy;
        userStatus = request.cookies.get('user_status')?.value;
      }
    }


    if (isPublicPage) {
      // If user is already logged in with an allowed role, redirect to dashboard
      if (roleCookie && allowedRoles.includes(roleCookie as Role)) {
        const dashboardPath = path.replace(/\/login$|\/register$/, '')
        return NextResponse.redirect(new URL(dashboardPath, request.url))
      }
      return NextResponse.next()
    }

    // Protected Page Logic
    if (!roleCookie || !allowedRoles.includes(roleCookie as Role)) {
      // Redirect to login
      const segments = path.split('/').filter(Boolean);
      const moduleRoot = segments.length > 0 ? `/${segments[0]}` : '/';
      return NextResponse.redirect(new URL(`${moduleRoot}/login`, request.url))
    }

    // Special Case: Agent with PENDING status
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
