import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'better-auth.session_token'
const SECURE_SESSION_COOKIE = '__Secure-better-auth.session_token'

export async function POST(request: NextRequest) {
  // Invalidate session server-side (pass original request headers for CSRF check)
  try {
    await auth.api.signOut({
      headers: request.headers,
    })
  } catch {
    // Session may already be expired — continue to clear cookie
  }

  // Redirect to login and clear the session cookie (both HTTP and HTTPS variants)
  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(new URL('/login', origin))
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
  response.cookies.set(SECURE_SESSION_COOKIE, '', { maxAge: 0, path: '/', secure: true })

  return response
}
