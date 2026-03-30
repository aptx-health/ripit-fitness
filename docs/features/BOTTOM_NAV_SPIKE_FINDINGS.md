# Bottom Nav Spike Findings (#287)

Spike test page: `app/(app)/dev/mobile-spike/`
Tested on: iPhone (iOS 18.6, Safari + PWA standalone), March 2026

## Validated Concerns

| Concern | Result | Notes |
|---------|--------|-------|
| Bottom nav + keyboard | Pass | Nav hides behind keyboard naturally on iOS Safari. No fix needed. |
| Z-index stacking | Pass | nav=40, floating button=45, modal=50. No bleed-through or overlap issues. |
| Floating draft button | Pass | Minimize/resume flow works. Pulsing dumbbell icon is visible and tappable. Confirmation prompt on tap works. |
| Scrolling | Pass | Content scrolls correctly behind bottom nav. Scroll position preserved across tab switches. |
| Full-screen modal | Pass | Covers everything including bottom nav. Keyboard inside modal pushes footer off screen (acceptable — #290 custom inputs will eliminate system keyboard during logging). |
| Safe areas (iOS) | Pass | `env(safe-area-inset-bottom)` correctly spaces bottom nav above home indicator. `env(safe-area-inset-top)` correctly spaces floating elements below notch/status bar. |
| PWA standalone mode | Pass | No layout issues. Standalone mode detected. Safe area padding applies correctly. |
| Scroll position preservation | Pass | Scroll position tracked per tab via ref. Switching tabs and returning preserves position. |

## Z-Index Hierarchy (validated)

```
Content (base)
  -> Bottom nav (z-40)
    -> Floating draft button (z-45)
      -> Full-screen modal (z-50)
        -> Debug overlay (z-100, dev only)
```

## Key Implementation Patterns

### Bottom nav
- `position: fixed; bottom: 0` with `paddingBottom: env(safe-area-inset-bottom, 0px)`
- `md:hidden` — mobile only
- Hidden entirely when workout logging modal is open (conditional render, not display:none)
- `bg-muted/95 backdrop-blur-sm` for slight transparency effect
- `border-t-2 border-border` for visual separation
- `h-14` bar height with `min-h-12 min-w-12` tap targets per tab

### Floating top elements
- No traditional header bar on mobile — floating pills over content
- Container uses `pointerEvents: 'none'` with `pointerEvents: 'auto'` on interactive children
- Branding pill: `rounded-full bg-muted/80 backdrop-blur-sm`
- Draft workout button: `rounded-full bg-accent animate-pulse`

### Content area padding
- Top: `calc(env(safe-area-inset-top, 0px) + 3.5rem)` to clear floating elements
- Bottom: `5rem` to clear bottom nav

### Full-screen modal (via portal)
- `createPortal` to `document.body` avoids stacking context issues
- Header padding: `calc(env(safe-area-inset-top, 0px) + 0.75rem)`
- Footer padding: `calc(env(safe-area-inset-bottom, 0px) + 0.75rem)`
- `100dvh` not needed when using `fixed inset-0`

### Keyboard behavior
- No special handling needed on iOS Safari — `position: fixed; bottom: 0` elements naturally scroll out of view when keyboard opens
- System keyboard pushes modal footer off screen — acceptable since #290 replaces keyboard with custom controls

## Tab Layout (locked)

| Position | Tab | Route |
|----------|-----|-------|
| 1 | Training | `/training` |
| 2 | Programs | `/programs` |
| 3 | Learn | `/learn` |
| 4 | Settings | `/settings` |

## Related Issues
- #280 — Bottom tab navigation (blocked by this spike, now unblocked)
- #288 — Workout minimization + floating draft button
- #290 — Custom input controls for workout logging
