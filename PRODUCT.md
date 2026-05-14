# Product

## Register

product

## Users

The primary user is a complete beginner walking into a gym for the first time — most often the person the Iron Works Boulder partnership puts in front of us. They've never run a structured strength program, they're nervous about doing the lifts wrong, and they're surrounded by people who seem to know more than they do. Their context is *mid-set, phone in hand, looking for the next thing to do.*

But the product is built so they don't outgrow it. An intermediate running a 5-week machine block, an experienced lifter logging RPE 8 backoff sets, and a returner coming back after a long break all have to feel served by the same surface. Settings carry the load: logger modes (follow-along vs full logging), opt-in intensity tracking (RIR/RPE), context-aware messaging keyed to user posture. The beginner is the lens; the intermediate is the retention case.

Single user per account. No teams, no coaches, no social feed.

## Product Purpose

Ripit is a strength training tracker that lets you build programs and log workouts without rigid app constraints. Programs are nested (Program → Week → Workout → Exercise → PrescribedSet / LoggedSet) so the app can show you "plan vs reality" without either side losing fidelity. The weight field is flexible enough to accept `135lbs`, `65%`, or `RPE 8` — because what a beginner writes is not what a trained lifter writes, and the app shouldn't force translation.

Success looks like: a Iron Works newcomer logs three workouts in their first two weeks, doesn't bounce, and a year later is logging RPE-tagged backoff sets without ever having switched apps. Graduation pressure is the failure mode.

## Brand Personality

**Patient, timely, quirky.**

- *Patient* means we don't shove tutorials at the user on day one and we don't punish them for the gaps in a logged session. We let the data fill in as they go.
- *Timely* means contextual help arrives the moment it's useful, not as a wall of upfront onboarding. The right tip at the right rep.
- *Quirky* is the load-bearing one. The frog mascot, the Rajdhani uppercase display type, the hard-angular L-bracket card corners, the warm cream-and-brown palette with green and amber accents — these are intentional. The look has a lineage: an earlier DOOM-inspired dark / hard-edge build pivoted toward something softer and welcoming, borrowing color from Donkey Kong Country and the mascot energy of Battletoads, while keeping the angular type and bracketed framing from the DOOM era. The juxtaposition (warm parchment background + military-stencil headings + cartoon frog) is the brand.

Voice in copy: direct, calm, occasionally dry. "The hardest week of the program. The last few reps of each set should feel genuinely difficult." Not "Crush it!" Not "You've got this, queen."

## Anti-references

Three lanes Ripit must stay out of:

1. **Gym-bro / influencer-culture aesthetics.** No macho neon. No carbon-fiber backgrounds. No shirtless-influencer photography. No "BEAST MODE" copy. The weight tracker category is saturated with this — Hevy and Strong lean here, and we explicitly don't.
2. **Generic clean-white SaaS.** Apple Fitness, Centr, most of Peloton's app surfaces. The reflexive "modern fitness app" answer is white background, thin sans, blue accent, abstract illustration. We are not that.
3. **Stock illustration and beauty-shot photography.** Exercise demos are real photos of real people in real gyms (see the Chest Supported Row demo). No flat-vector mascots-doing-yoga, no studio-lit ad imagery.

What we're aiming for instead: **gentle, retro, quirky, welcoming.** A weightlifting app that looks like a 16-bit platformer manual rebuilt as a tracker, not a fitness brand.

## Design Principles

1. **The beginner is the lens, not the ceiling.** Every screen has to work for someone who's never trained before *and* not feel cramped to someone running their fifth program. When those pull in different directions, the beginner wins — but the intermediate path stays one settings toggle away.
2. **Meet the user where they are, don't make them switch apps to grow.** Logger modes (follow-along vs logging), opt-in intensity, context-aware messaging keyed to user posture. The product adapts to the person; the person doesn't graduate away from it.
3. **Quirky over clean.** When a design choice is between "tasteful default" and "specifically Ripit," choose Ripit. The hard-bracket card corners, the cream parchment background, the uppercase Rajdhani — none of these are conventional, all of them are load-bearing.
4. **Patient and timely.** Help and context arrive at the moment of use, not as an upfront wall. Don't ask the user to learn the app before using the app. Don't withhold the answer when they're already mid-set.
5. **Real over stock.** Real photos, real gyms, real lifters. The visual library is part of the brand promise — that this app is for people training in actual rooms, not staged ones.

## Accessibility & Inclusion

We care, we don't have a formal compliance target yet. The OKABE color-blind-safe theme is the strongest concrete signal: it ships as a peer of the default theme, not as an afterthought. Beyond that:

- No formal WCAG AA / AAA commitment today.
- No formal reduced-motion / screen-reader / keyboard-nav coverage commitment today.
- Touch targets are mobile-first by default because the primary surface is a phone held mid-set, often one-handed — sizing should reflect that even without a written rule.

When new work is designed, default to choices that don't *foreclose* on accessibility later (semantic HTML, sufficient contrast on every theme, labeled controls). When a choice is between "easy now, expensive to retrofit" and "slightly more work now, accessible later," take the second one. But don't gate shipping on full WCAG conformance — that's not where we are yet.
