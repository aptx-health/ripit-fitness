# Exercise data pipeline (archived)

One-off scripts that built and enriched the exercise library (seed generation, metadata, images, tags). The pipeline is done; they are kept for reference only.

They were written to run from `scripts/`, so paths such as `__dirname/exercise-mapping.json` and `__dirname/../prisma/seeds` no longer resolve from here. Move a script back to `scripts/` before running it.

Still live in `scripts/`: `build-exercise-mapping.ts`, `exercise-matching-utils.ts`, `exercise-manual-overrides.json` and its output `exercise-mapping.json` (the iOS catalog build and tests read it).
