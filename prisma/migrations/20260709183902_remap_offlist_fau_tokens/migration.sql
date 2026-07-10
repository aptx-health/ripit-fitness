-- Data migration: FAU taxonomy hygiene (issue #959)
--
-- Remap off-list FAU tokens in the exercise catalog to valid members of
-- ALL_FAUS (see lib/fau-volume.ts):
--   abductors  -> glutes
--   hip-flexors -> quads
--
-- Off-list tokens have no target in per-FAU scoring, so any comparison against
-- them silently no-ops. This normalizes existing ExerciseDefinition rows.
--
-- Order-preserving dedupe: after replacement, an array may contain the target
-- token twice (e.g. ['glutes','abductors'] -> ['glutes','glutes']). We rebuild
-- each affected array keeping first-occurrence order and dropping duplicates.
--
-- Idempotent: the WHERE clause only touches rows that still contain an off-list
-- token, so re-running this migration is a no-op.

-- primaryFAUs
UPDATE "ExerciseDefinition"
SET "primaryFAUs" = (
  SELECT COALESCE(array_agg(t ORDER BY ord), ARRAY[]::text[])
  FROM (
    SELECT t, MIN(ord) AS ord
    FROM unnest(
      array_replace(
        array_replace("primaryFAUs", 'abductors', 'glutes'),
        'hip-flexors', 'quads'
      )
    ) WITH ORDINALITY AS x(t, ord)
    GROUP BY t
  ) deduped
)
WHERE 'abductors' = ANY("primaryFAUs")
   OR 'hip-flexors' = ANY("primaryFAUs");

-- secondaryFAUs
UPDATE "ExerciseDefinition"
SET "secondaryFAUs" = (
  SELECT COALESCE(array_agg(t ORDER BY ord), ARRAY[]::text[])
  FROM (
    SELECT t, MIN(ord) AS ord
    FROM unnest(
      array_replace(
        array_replace("secondaryFAUs", 'abductors', 'glutes'),
        'hip-flexors', 'quads'
      )
    ) WITH ORDINALITY AS x(t, ord)
    GROUP BY t
  ) deduped
)
WHERE 'abductors' = ANY("secondaryFAUs")
   OR 'hip-flexors' = ANY("secondaryFAUs");
