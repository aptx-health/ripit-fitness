Report: needs decision → resolved by lead
138 coaching slice 1 build (coach-impl, 2026-11-06). Not committed. Schema + migration 20261107024653_coaching_invites (CHECK as its own ALTER TABLE); lib/coaching/{invites,links}.ts; lib/auth/return-path.ts (same-origin ?next=); 4 routes under app/api/coaching; limiters coachInvite/coachAccept/coachLink (+ RATE_LIMITING.md); Settings → Coaching page + loading.tsx; /coach/invite/[token]; Coaching row in AccountBlock; return path through login/signup/onboarding/OAuth/waiver; middleware; admin proposal pages show "Coach" for a null token.
Checks: coaching steps 65/65 (scratch copy with the amended strings), middleware 9/9; suite 4163 pass; tsc clean; 21 screenshots initiatives/coaching/docs/assets/138/.
Decisions: Revoke immediate, End confirms; accept limited per user and IP; refusals 410/400/409; one active link per pair by advisory lock (db push drops partial unique indexes); pending proposals stay on End.
Needs a call: (1) two step texts out of date after the lead's spec amendment; (2) "only what he sends you" assumes the coach's gender.
Not verified: real Google round trip; new user sign-up → onboarding → waiver → invite in a browser; CHECK exists only in the migration (local DB via db push).
Outside: app/waiver SAFE_NEXT_PATH accepts "//evil.com".

Round 2 (2026-11-06): invite copy "only what they send you"; app/waiver uses lib/auth/return-path.ts (real hole was dotless hosts like //2130706433, //intranet/x; new __tests__/app/waiver-return-path.test.tsx, 10 cases). Coaching 74/74; suite 4238 pass; tsc clean. invite-valid-*.png screenshots still show the old "he" copy.
