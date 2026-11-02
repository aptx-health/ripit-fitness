---
title: The iOS 27 top blur in the installed Ripit app comes from the black-translucent status bar
type: research-spike
question: Why does the installed Ripit PWA blur content at the top of the screen since the latest iOS, when Collie doesn't?
status: answered
created: 2026-11-01
verified_as_of: 2026-11-01
recheck_by: 2027-01-15
confidence: medium
tags: [ios, pwa, safe-area, status-bar, liquid-glass]
projects: [ripit-fitness/ui-audit]
sources:
  - https://bugs.webkit.org/show_bug.cgi?id=317153
  - https://bugs.webkit.org/show_bug.cgi?id=301994
  - https://github.com/YuzhouTian/trailhead/pull/120
  - https://github.com/CodingItWrong/riverbed-web/pull/981
  - https://github.com/Flixarr/flixarr/issues/177
  - https://github.com/yetone/magpie/issues/3515
  - ~/.local/share/collie/versions/1.23.4/web/dist/index.html (Collie 1.23.4, installed build)
---

## Answer
Most likely cause: Ripit asks iOS for a **see-through status bar** (`statusBarStyle: "black-translucent"` in `app/layout.tsx:39`). Content then scrolls up underneath it, because nothing at the top of the mobile layout stays put. iOS 27 draws a frosted "scroll edge" blur over the top of installed web apps that use a translucent bar. Collie avoids exactly this: its source has a comment saying it switched to `default` for this reason.

**Recommended fix:** switch to `statusBarStyle: "default"` and add a `theme-color` that matches the page background. iOS only reads this setting at Add to Home Screen, so **Dustin must delete the icon and re-add it** to see the change.

**Confidence:** medium. There is no Apple or WebKit document of the blur itself. The evidence is Collie's own comment, many matching iOS 27 developer reports, and a WebKit engineer calling `black-translucent` deprecated.

## How Ripit handles the top today
1. **FACT:** `app/layout.tsx:26-31` sets `viewport-fit: cover`.
2. **FACT:** `app/layout.tsx:37-41` sets `appleWebApp.statusBarStyle: "black-translucent"`. That emits `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`.
3. **FACT:** there is no `theme-color` meta tag. Only `public/site.webmanifest` sets one: `theme_color: "#EA580C"` (orange), with `background_color: "#000000"` and `display: "standalone"`.
4. **FACT:** on mobile there is no top bar at all. `components/Header.tsx:31` is `hidden md:block`. `app/(app)/layout.tsx:42-45` adds a plain spacer div with `padding-top: env(safe-area-inset-top)`. That spacer is not sticky or fixed, so it scrolls away, and the page content (e.g. the Training tabs) then scrolls into the status-bar area.
5. **FACT:** Ripit has no `backdrop-filter` near the top. The only page-wide blur is the fixed bottom nav (`components/BottomNav.tsx:29`, `backdrop-blur-sm`). The one `filter: blur` in `app/globals.css:2606` is a 3px chip shine. **INFERENCE:** so the top blur isn't drawn by Ripit's CSS; it comes from the system.
6. **INFERENCE:** the Training page shows it most because it's long and its colourful paper tabs and blocks scroll through the top strip, where a blur is easy to see.

## What changed in iOS
7. **FACT:** Collie 1.23.4's `index.html` says: "Not `black-translucent`: iOS 27 blurs the top edge of a translucent one, into the header. iOS reads this once, at Add to Home Screen, so a change needs a re-add to show." Collie uses `content="default"`.
8. **FACT ([WebKit 317153](https://bugs.webkit.org/show_bug.cgi?id=317153)):** an Apple WebKit engineer says `black-translucent` "has been deprecated for multiple releases". They ask developers to remove it, and add that Home Screen web apps don't support "drawing arbitrary content below the status bar". The bug itself was a related iOS 27 beta letterboxing regression, fixed in beta 4.
9. **FACT ([WebKit 301994](https://bugs.webkit.org/show_bug.cgi?id=301994), reopened for iOS 27 beta):** with a translucent bar, reporters see `env(safe-area-inset-top)` come back as 0 instead of about 44pt, along with a gap the system draws itself.
10. **NOT VERIFIED (developer reports, no Apple source):** several projects describe a frosted blur over the top of installed apps on iOS 27, tied to the translucent bar: [flixarr #177](https://github.com/Flixarr/flixarr/issues/177), [magpie #3515](https://github.com/yetone/magpie/issues/3515), [opencode #56969](https://github.com/anomalyco/opencode/issues/56969), [trailhead #118/#120](https://github.com/YuzhouTian/trailhead/pull/120), [riverbed #981](https://github.com/CodingItWrong/riverbed-web/pull/981).
    - Trailhead's explanation: under a translucent bar WebKit reports no top inset, so the blur never turns off. Its fix was `default`, but it was **not tested on a device**.
    - Some reports say the blur reaches about 40px below the status bar and doesn't reproduce in the Simulator.
11. **INFERENCE:** this is the Liquid Glass "scroll edge effect" that iOS 26 added to native and Safari bars, now applied to the status-bar strip of standalone web apps on iOS 27. I found no WebKit blog or release-note entry naming it.

## Comparison with Collie (read only)
Collie isn't under `~/projects`. I read its installed web build, `~/.local/share/collie/versions/1.23.4/web/dist/`. It's [AltanS/collie](https://github.com/AltanS/collie), so it's not Dustin's own code.

| | Ripit | Collie |
|---|---|---|
| status-bar style | `black-translucent` | `default` (comment cites the iOS 27 blur) |
| `viewport-fit` | `cover` | `cover` |
| `theme-color` meta | none (manifest: orange `#EA580C`) | `#f5f5f5` (light) / `#0a0a0a` (dark), rewritten at runtime for a pinned theme |
| manifest colours | bg `#000`, theme `#EA580C` | both `#0a0a0a` |
| top of the screen | non-sticky spacer; content scrolls under the bar | fixed header padded by `env(safe-area-inset-top)` |

## Candidate fixes (no code changed here)

**1. Solid status bar (recommended)**
- **The change:** in `app/layout.tsx`:
  - set `appleWebApp.statusBarStyle: "default"`;
  - add `themeColor` to the `viewport` export, e.g. `[{ media: '(prefers-color-scheme: dark)', color: <ripit dark background> }, { media: '(prefers-color-scheme: light)', color: <ripit light background> }]`;
  - optionally set the manifest's `theme_color` to the dark background too.
  - Keep `viewport-fit: cover`. The spacer div then just collapses to 0, which is harmless.
- **Trade-off:**
  - The status bar becomes a solid band, and nothing scrolls under it.
  - With 12 themes and a light/dark choice, a static `theme-color` won't match every theme. Matching exactly needs a small runtime update of the meta tag in the theme initializer, which is how Collie does it. That could be a follow-up.
- **Check on the phone:**
  1. Serve the branch with the `phone-preview` skill.
  2. **Delete the Ripit icon and re-add it from Safari** (iOS reads the style only at add time).
  3. Scroll the Training page: the top should be a solid band with no blur.
  4. Also check the dark and light modes.

**2. A sticky, opaque top strip** (keep `black-translucent`)
- **The change:** make the safe-area spacer in `app/(app)/layout.tsx:42-45` `sticky top-0 z-40 bg-background`, so content no longer scrolls through the top edge.
- **Trade-off:** reports disagree on whether it works.
  - Riverbed's sticky-bar fix is untested.
  - Trailhead found an edge strip alone left the top "still frosted".
  - Under a translucent bar `env(safe-area-inset-top)` may be 0 (finding 9), so the strip could have no height.
- **Check on the phone:** as in fix 1; a re-add isn't needed for CSS, but do it anyway if the result is unclear. Low confidence.

**3. Do nothing**
- Apple calls `black-translucent` deprecated (finding 8), so the blur is likely to stay or get worse.

## Conflicts resolved
- **Can a solid element at the top clear the blur?** Some reports say a solid top element does. Trailhead found it didn't while the bar was translucent; magenta-box tests in other reports had mixed results. Collie and Apple's guidance both point to dropping `black-translucent`, so fix 1 ranks above fix 2.
- **Isn't 317153 marked fixed?** It's a different iOS 27 beta issue (letterboxing, fixed in beta 4). What matters for us is the engineer's guidance in it, not its status.

## Not verified
- No device test. I have no iPhone on iOS 27, and the reports say the Simulator doesn't show the blur.
- The exact iOS version Dustin is on, and when the blur started for him.
- That fix 1 removes the blur for Ripit specifically: both supporting fixes (Collie's, trailhead's) are by analogy, and trailhead's was untested.
- Any Apple documentation of the iOS 27 top-edge blur for web apps.

## Open questions / next spikes
- If fix 1 lands: sync `theme-color` and the status-bar colour to the chosen theme at runtime, like Collie's `useTheme`.
- The iOS splash screens (commit `95304696`, later reverted in `93207fd9`) are unrelated, but are worth re-checking after a re-add.
