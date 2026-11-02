import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/auth/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!sentry-tunnel|_next/static|_next/image|favicon.ico|sw\\.js$|swe-worker-[^/]*\\.js$|site\\.webmanifest$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
