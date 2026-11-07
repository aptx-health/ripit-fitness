---
id: 155
state: waiting
waiting_on: 154
executor: ios-review
skill: reviewer
from: lead (worktree-brave-field-c150)
confirmed: 2026-11-07 Dustin (slice 1 plan, this worktree, bundle id fit.ripit.ios)
updated: 2026-11-07
---
# iOS slice 1: review

## Goal
An independent verdict: does slice 1 meet `features/ios-app/skeleton.feature`, and is it sound Swift that later slices can build on?

## Read first
- `features/ios-app/skeleton.feature`, `initiatives/ios-app/scoping.md`, `work/154-ios-skeleton-build.md`.
- The diff of `ios/`, `scripts/ios/`, `mise.toml` on the slice branch. Do not read `work/154-handback.md` before your first pass.

## Do
Follow the review section of the V3 operating agreement: run `mise run ios-check`, then an unaided first pass, then up to 3 questions, then the revised verdict. Pay attention to the schema and migrations (they must carry slice 2's import), data loss on resume/discard, and that the bundled catalog matches the seed.

## Hand back
A review packet with first line `Report: complete | needs decision | further handoff` and a clear verdict.

## Log
- 2026-11-07 CST: created (waiting on 154).
