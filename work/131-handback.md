# 131 handback (test-builder, 2026-11-04)
Report: needs decision. 7 locked files, 215 tests: `__tests__/lib/eink-display.test.ts` (22), `__tests__/lib/eink-theme.test.ts` (10), `__tests__/app/eink-inline-scripts.test.ts` (50), `__tests__/styles/eink-css.test.ts` (71), `__tests__/components/eink-motion.test.tsx` (26), `__tests__/components/eink-theme-ui.test.tsx` (32), `__tests__/app/eink-settings-ssr.test.tsx` (4). 166 red, 49 controls pass; 186 existing theme/settings tests pass. Break matrix 144/144 killed.
Choices (contract in each file header):
1. `lib/display.ts`: getEinkDisplay/setEinkDisplay/applyEinkDisplay/useReducedMotion; localStorage `einkDisplay` "true"/"false" beats cookie `eink_display`; off removes `data-display`.
2. useReducedMotion reacts to the OS query change and to set/apply while mounted; false on the server.
3. Picking E-INK saves {eink, light} and turns the display on; other themes never write the display.
4. Mode switch with E-INK hidden, or disabled with "E-INK is light only".
5. Settings switch role=switch /e-ink display/i, exact hint, 48px, anywhere on the page.
6. Inline scripts plain text; VALID_THEMES equals THEMES; eink:dark never written back.
7. CSS: eink block defines every ripit token; white bg/card, black fg/border/*-text; muted-foreground ≥7:1; fills ≥7:1 with their foreground; six fills HSL saturation ≥0.5 and ≥90 apart in RGB; no gradients/alpha/color-mix; global no box-shadow/text-shadow/background-image; borders/dividers ≥2px; .text-{six} and .border-{six} black. `[data-display="eink"]` kills animation/transition everywhere; body ≥500, font-normal/light ≥500, text-xs ≥600.
8. LiftSkeleton must drop animate-pulse via the hook (client component), not CSS only.
Not verified: real look, BOOX width, inline styles (FollowAlongTabs shadows/gradient/color-mix, 15 inline `color: var(--primary)`), `.text-destructive`, Tailwind /10 tints, Kaleido distinctness.
Lead (2026-11-04): re-ran, 166 fail / 49 pass. All 8 choices accepted; attribute-absent for off is fine. The not-verified styling gaps go to the build (fix the inline styles) and the device check.
