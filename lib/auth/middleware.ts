// BetterAuth middleware helpers
// Checks session cookie for redirect logic (not validation — that happens server-side)

import { type NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'better-auth.session_token'

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request })

  // Mock auth mode — skip auth entirely
  if (process.env.USE_MOCK_AUTH === 'true') {
    return response
  }

  const hasSession = request.cookies.has(SESSION_COOKIE)
  const { pathname } = request.nextUrl

  // Unauthenticated user trying to access protected routes
  if (!hasSession &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/signup') &&
      !pathname.startsWith('/_next') &&
      !pathname.startsWith('/api')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated user trying to access auth pages
  if (hasSession &&
      (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
