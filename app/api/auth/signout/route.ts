import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Use the request origin to redirect to the correct port
  const origin = request.nextUrl.origin
  return NextResponse.redirect(new URL('/login', origin))
}
