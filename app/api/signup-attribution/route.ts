import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import {
  authSensitiveLimiter,
  checkRateLimit,
  getClientIp,
} from "@/lib/rate-limit"
import {
  encodeSignupAttribution,
  isValidSignupAttribution,
  SIGNUP_ATTRIBUTION_COOKIE,
  SIGNUP_ATTRIBUTION_TTL_SECONDS,
} from "@/lib/signup-attribution-cookie"

/**
 * Sets a short-lived cookie carrying signup attribution (source / method /
 * gymSlug / mode). Called by the signup form and OAuth buttons immediately
 * before the user is sent into BetterAuth.
 *
 * The cookie is read inside `databaseHooks.user.create.after` (lib/auth.ts)
 * to stamp the `signup_completed` AppEvent — this is what /admin/signups
 * surfaces as the "Source" column.
 *
 * Cookies (unlike sessionStorage) survive the OAuth top-level redirect
 * across storage partitions, in-app-browser handoffs, etc., which is why
 * the prior client-beacon approach was losing events.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const limited = await checkRateLimit(authSensitiveLimiter, `signup-attr:${ip}`)
    if (limited) return limited

    const body = (await request.json().catch(() => null)) as unknown
    if (!isValidSignupAttribution(body)) {
      return NextResponse.json(
        { error: "Invalid attribution payload" },
        { status: 400 }
      )
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set({
      name: SIGNUP_ATTRIBUTION_COOKIE,
      value: encodeSignupAttribution(body),
      httpOnly: true,
      sameSite: "lax", // must be lax so the cookie rides the OAuth redirect back
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SIGNUP_ATTRIBUTION_TTL_SECONDS,
    })
    return response
  } catch (error) {
    logger.error({ error, context: "signup-attribution" }, "Failed to set signup attribution cookie")
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
