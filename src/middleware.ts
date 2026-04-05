import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAllowedRolesForPath } from './lib/rbac'

const AUTH_SESSION_COOKIE = 'session_id'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Check if current path requires specific roles
  const allowedRoles = getAllowedRolesForPath(path)

  if (allowedRoles) {
    const isLoginPage = path.endsWith('/login')
    const isRegisterPage = path.endsWith('/register')
    const isPublicPage = isLoginPage || isRegisterPage
    const hasSession = Boolean(request.cookies.get(AUTH_SESSION_COOKIE)?.value)

    if (isPublicPage) {
      if (hasSession) {
        const dashboardPath = path.replace(/\/login$|\/register$/, '')
        return NextResponse.redirect(new URL(dashboardPath, request.url))
      }
      return NextResponse.next()
    }

    if (!hasSession) {
      const segments = path.split('/').filter(Boolean);
      const moduleRoot = segments.length > 0 ? `/${segments[0]}` : '/';
      return NextResponse.redirect(new URL(`${moduleRoot}/login`, request.url))
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
