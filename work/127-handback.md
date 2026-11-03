# 127 handback (reviewer, 2026-11-02)
Report: needs decision. Verdict: fix first. Feature true live otherwise; maths, scoping, 404, limiter hold. Suite 3877 pass; tsc/eslint/biome clean; locked tests predate code.
Findings: 1 (med) browser Back loses the week: ProgressView never writes ?week=. 2 (med, Dustin) lifts trained >12 reps: empty e1RM tab ("No sessions in this range") while the S2 Lifts row shows e1RM 238 for 155×16. 3 (low) Volume range starts at the Monday before now−N, other tiles at exactly now−N. 4 (low) mixed weighted/bodyweight lifts plot weight-0 sessions at 0 on Top set and overlay. 5 (low, style) rust line, no fill; long chip/title names. 6 (info) ChartTabs duplicates PaperTabs for 48px; LiftView 565 lines; route 7 fixed queries.
Handbacks 125/126 hold except the over-12-rep empty state.
Screenshots `initiatives/analytics/docs/assets/127/` (11 × light/dark). Data restored; servers stopped. Not verified: kg users, 19+ sessions, a real phone, Redis limiter.
Dustin (2026-11-02): high reps → open on Top set + cap the S2 row's e1RM at 12 + uncapped rep records; chart → keep rust, add a light fill. Fixes in 128.
