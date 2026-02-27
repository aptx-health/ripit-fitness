import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE = 'better-auth.session_token'

export async function POST(request: NextRequest) {
  // Call BetterAuth's sign-out endpoint internally
  const baseUrl = process.env.BETTER_AUTH_URL || request.nextUrl.origin
  await fetch(`${baseUrl}/api/auth/sign-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: request.headers.get('cookie') || '',
    },
    body: JSON.stringify({}),
  })

  // Redirect to login and clear the session cookie
  const origin = request.nextUrl.origin
  const response = NextResponse.redirect(new URL('/login', origin))
  response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })

  return response
}
