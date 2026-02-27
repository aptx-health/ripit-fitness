import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  await auth.api.signOut({
    headers: await headers(),
  })

  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL('/login', origin))
}
