Report: complete
135 Learn in Settings (implementer, 2026-11-06). Help block: Learn row first (SettingsLinkRow, BookOpen, hint "Articles and guides") → /learn. LearnBrowser: "← Settings" back link above the LEARN title (SubpageHeader's classes; title kept). Both /learn redirects removed from next.config.ts. New app/(app)/learn/loading.tsx. Test: __tests__/components/learn-in-settings.test.tsx. Screenshots work/assets/135/ (headless Playwright).
Checks: suite 4156 pass; tsc clean; perf:scan one finding left (/settings no-loading, out of scope → ROADMAP perf sweep).
