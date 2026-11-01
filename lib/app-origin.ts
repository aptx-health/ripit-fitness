import { headers } from 'next/headers'

/**
 * The app's public origin, read at request time (never inlined at build, unlike
 * NEXT_PUBLIC_APP_URL). BETTER_AUTH_URL comes first: it is a runtime server
 * variable that must already be the public URL in every environment, or sign-in
 * breaks. Without it, fall back to the request's forwarded host and scheme
 * (set by the ingress), then its Host header.
 */
export async function appOrigin(): Promise<string> {
  const configured = process.env.BETTER_AUTH_URL?.trim()
  if (configured) return configured.replace(/\/+$/, '')

  const h = await headers()
  const host = h.get('x-forwarded-host')?.split(',')[0]?.trim() || h.get('host')
  const proto = h.get('x-forwarded-proto')?.split(',')[0]?.trim() || (host?.startsWith('localhost') ? 'http' : 'https')
  return host ? `${proto}://${host}` : ''
}
