#!/usr/bin/env bash
# smoke-test-ssr.sh — Verify key routes render without SSR errors.
#
# Next.js embeds SSR errors as <template data-msg="..."> tags in the HTML
# when it falls back to client rendering. In production this fallback often
# fails entirely, showing "This page couldn't load." This script catches
# those errors before they reach users.
#
# Usage:
#   ./scripts/smoke-test-ssr.sh                        # default: http://localhost:3000
#   ./scripts/smoke-test-ssr.sh http://localhost:3099   # custom base URL
#
# The app must already be running when you invoke this script.

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

# Routes to check. These are public or redirect-safe routes that can be
# fetched without an auth cookie. Add new public pages here as they ship.
ROUTES=(
  "/"
  "/login"
  "/signup"
  "/forgot-password"
  "/go/ironworks"
  "/go/ironworks?mode=beginner"
  "/go/ironworks?mode=experienced"
  "/waiver"
)

FAILED=0
PASSED=0

for route in "${ROUTES[@]}"; do
  url="${BASE_URL}${route}"

  # Fetch the page (-L follows redirects, -s silent, -S show errors)
  HTTP_CODE=$(curl -s -o /tmp/ssr-smoke-body -w '%{http_code}' -L "$url" 2>/dev/null || echo "000")

  # Check for 5xx
  if [ "$HTTP_CODE" -ge 500 ] 2>/dev/null; then
    echo "FAIL [${HTTP_CODE}] ${route} — server error"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Check for connection failures
  if [ "$HTTP_CODE" = "000" ]; then
    echo "FAIL [---] ${route} — connection refused"
    FAILED=$((FAILED + 1))
    continue
  fi

  # Check for SSR error markers in the HTML body.
  # Next.js injects <template data-msg="..."> when SSR crashes and the
  # framework falls back to client-side rendering. These are invisible
  # to the user in dev but often cause full-page errors in production.
  if grep -q 'data-msg=' /tmp/ssr-smoke-body 2>/dev/null; then
    MSG=$(grep -o 'data-msg="[^"]*"' /tmp/ssr-smoke-body | head -1)
    echo "FAIL [${HTTP_CODE}] ${route} — SSR error: ${MSG}"
    FAILED=$((FAILED + 1))
    continue
  fi

  echo "  OK [${HTTP_CODE}] ${route}"
  PASSED=$((PASSED + 1))
done

rm -f /tmp/ssr-smoke-body

echo ""
echo "SSR smoke test: ${PASSED} passed, ${FAILED} failed"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
