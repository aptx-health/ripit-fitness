---
name: phone-preview
description: Use when Dustin wants to try the current branch on his phone (or any tailnet device) before merging: builds this checkout, serves it over Tailscale, and stops it again afterwards.
---
# Phone preview

Serves the current checkout's branch at `https://<this Mac>.<tailnet>.ts.net:10000`, reachable only on Dustin's tailnet. It's a production build (`npm run build`, webpack, as in CI) running on this checkout's own Postgres container.

## Run
- Start, in the background, since it keeps running: `.claude/skills/phone-preview/phone-preview.sh start`. The build takes 3–5 minutes. Wait for `Ready in`, then check with `status`.
- Check: `.claude/skills/phone-preview/phone-preview.sh status`. Expect `200` from `/api/health/live`.
- Stop when Dustin is done: `.claude/skills/phone-preview/phone-preview.sh stop`. This stops the app, turns off the tailnet port and stops Postgres.

Tell Dustin the URL and the login: `dmays@test.com / password`.

**Put the live link in the review pack.** When a Handoff Hub review page goes out for this branch, add a "Try it on your phone" section at the top. Include the preview URL (deep-link to the page under review, e.g. `/admin/proposals`), the login, and 3–4 tap-by-tap steps. The URL can change between runs, so take it from `status` each time. If you restart the preview after the page has gone out, publish a new revision with the current link.

To give Dustin something to act on, seed through the app's real APIs (sign in with curl, create an agent token, call `/api/mcp`), not by inserting rows directly. When he's done, revoke the token in `/admin/agent-tokens`.

## Rules
- **No real side effects.** The script blanks `DISCORD_PROPOSALS_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` and `BARK_URL`, so proposals Dustin makes on the phone won't post to Discord. Don't remove that.
- The data is the checkout's local dev database, not staging or production.
- Auth URLs are set to the tailnet origin at build time. That's why it rebuilds on every start; a plain `next dev` on localhost won't accept a phone login.
- Port 10000 is one of the three HTTPS ports Tailscale Serve allows. 443 and 8443 are already used on this Mac. Use `PHONE_PREVIEW_PORT` to change it.

## Pitfalls
- `next build` without `--webpack` fails on `app/api/health/route.ts` (Turbopack rejects the re-exported `dynamic`). Always use `npm run build`.
- `next start` warns about `output: standalone`. The warning is harmless here; pages and static chunks are served normally.
