/**
 * Injury -> exercise ban-list mapping (issue #918).
 *
 * Suggest must never recommend loading an injured area. This module turns the
 * structured injuries on `UserTrainingProfile` (body area x severity, captured
 * by the Goals wizard or the interview) into concrete ban-list fields for the
 * suggest payload.
 *
 * This is a **pure, deterministic** mapping — no LLM. The training-state builder
 * calls {@link computeInjuryBanList} on profile change; nothing is persisted.
 *
 * Severity semantics (from `INJURY_SEVERITIES`):
 *   - `avoid_loading` -> HARD BAN. The exercise id is excluded from candidates.
 *   - `caution`       -> SOFT FLAG. The movement patterns / FAUs are carried
 *                        separately so the planner can down-weight rather than
 *                        exclude.
 *   - `recovered`     -> NO EFFECT (historical context only).
 *
 * An exercise "loads" an injured area when its `movementPattern` is one of the
 * area's patterns, OR its `primaryFAUs` intersect the area's FAUs. Untagged
 * exercises (null `movementPattern`, empty FAUs) are never banned by pattern —
 * consistent with the auto-tag contract ("treat untagged as no constraint").
 */

import type { MovementPattern } from '@/lib/exercises/auto-tag'
import type { FAUKey } from '@/lib/fau-volume'
import type { InjuryArea, InjuryEntry } from '@/lib/user-training-profile'
import { INJURY_AREAS } from '@/lib/user-training-profile'

/**
 * Which movement patterns and FAUs load a given injured area. Every area in the
 * profile enum maps to a non-empty pattern set (asserted in tests). Kept
 * deliberately conservative — the FAU list is the muscle groups that directly
 * load the joint/region; the pattern list catches compound lifts that stress it
 * even when the primary FAU is elsewhere.
 */
export interface AreaLoadProfile {
  patterns: readonly MovementPattern[]
  faus: readonly FAUKey[]
}

export const INJURY_AREA_LOAD_MAP: Record<InjuryArea, AreaLoadProfile> = {
  // Neck: axial loading from carries and shrugs; traps are the direct driver.
  neck: {
    patterns: ['carry', 'vertical_push'],
    faus: ['traps'],
  },
  // Shoulder: all pressing plus direct deltoid work.
  shoulder: {
    patterns: ['vertical_push', 'horizontal_push'],
    faus: ['front-delts', 'side-delts', 'rear-delts'],
  },
  // Elbow: pressing (triceps) and curling (biceps) both load the joint.
  elbow: {
    patterns: ['horizontal_push', 'vertical_push'],
    faus: ['triceps', 'biceps'],
  },
  // Wrist: grip-heavy carries and direct forearm/curl work.
  wrist: {
    patterns: ['carry'],
    faus: ['forearms', 'biceps'],
  },
  // Upper back: all pulling plus the direct upper-back musculature.
  upper_back: {
    patterns: ['vertical_pull', 'horizontal_pull'],
    faus: ['mid-back', 'lats', 'traps', 'rear-delts'],
  },
  // Lower back: hinges are the classic offender; squats and loaded carries
  // stress the spine too.
  lower_back: {
    patterns: ['hinge', 'squat', 'carry'],
    faus: ['lower-back', 'glutes', 'hamstrings'],
  },
  // Hip: hinge/squat/lunge all drive hip flexion/extension.
  hip: {
    patterns: ['hinge', 'squat', 'lunge'],
    faus: ['glutes', 'hamstrings', 'adductors', 'quads'],
  },
  // Knee: squats and lunges load the knee under flexion.
  knee: {
    patterns: ['squat', 'lunge'],
    faus: ['quads', 'hamstrings'],
  },
  // Ankle: squats/lunges through dorsiflexion; calves directly.
  ankle: {
    patterns: ['squat', 'lunge'],
    faus: ['calves'],
  },
}

/**
 * Minimal exercise shape the mapping needs. Matches `ExerciseDefinition`
 * (`movementPattern`, `primaryFAUs`, `secondaryFAUs`) but only the fields used.
 */
export interface InjuryBanExercise {
  id: string
  movementPattern: string | null
  primaryFAUs: string[]
}

/**
 * Ban-list fields for the suggest payload. `bannedExerciseIds` merges into the
 * payload's `banned_exercise_ids`; the cautioned sets are carried separately so
 * the planner can down-weight rather than exclude; `notes` surfaces anything
 * that couldn't be mapped (unknown area, free-text-only injury).
 */
export interface InjuryBanListResult {
  /** Hard bans (severity `avoid_loading`). Sorted, de-duplicated. */
  bannedExerciseIds: string[]
  /** Soft flags (severity `caution`) — movement patterns to down-weight. */
  cautionedMovementPatterns: MovementPattern[]
  /** Soft flags (severity `caution`) — FAUs to down-weight. */
  cautionedFAUs: FAUKey[]
  /** Human-readable notes for injuries that produced no structured mapping. */
  notes: string[]
}

function isKnownArea(area: string): area is InjuryArea {
  return (INJURY_AREAS as readonly string[]).includes(area)
}

/**
 * Does this exercise load the given area (by movement pattern or primary FAU)?
 */
function exerciseLoadsArea(
  exercise: InjuryBanExercise,
  load: AreaLoadProfile
): boolean {
  const pattern = exercise.movementPattern
  if (pattern && (load.patterns as readonly string[]).includes(pattern)) {
    return true
  }
  const faus = load.faus as readonly string[]
  return exercise.primaryFAUs.some((fau) => faus.includes(fau))
}

/**
 * Compute the injury-derived ban list from structured profile injuries.
 *
 * Deterministic: identical input yields identical output (all outputs sorted).
 * Robust: unknown / free-text-only injuries degrade to a note, never a throw.
 *
 * @param injuries  Structured injuries from `UserTrainingProfile.injuryAreas`.
 *                  Loosely typed so raw/unnormalized entries can't crash it.
 * @param exercises Candidate exercise catalog (id + movementPattern + FAUs).
 */
export function computeInjuryBanList(
  injuries: readonly (InjuryEntry | { area?: unknown; severity?: unknown })[],
  exercises: readonly InjuryBanExercise[]
): InjuryBanListResult {
  const banned = new Set<string>()
  const cautionedPatterns = new Set<MovementPattern>()
  const cautionedFAUs = new Set<FAUKey>()
  const notes: string[] = []

  for (const injury of injuries ?? []) {
    const area = typeof injury?.area === 'string' ? injury.area : null
    const severity =
      typeof injury?.severity === 'string' ? injury.severity : null

    // Recovered / historical: no effect.
    if (severity === 'recovered') continue

    // Only avoid_loading and caution drive the ban list.
    if (severity !== 'avoid_loading' && severity !== 'caution') {
      if (area) {
        notes.push(
          `Unmapped injury (severity "${severity ?? 'unknown'}") reported — no ban applied.`
        )
      }
      continue
    }

    // Unknown / free-text-only area: degrade to a note, never a ban.
    if (!area || !isKnownArea(area)) {
      notes.push(
        `Free-text or unrecognized injury area reported — mindful, but no automatic ban could be applied.`
      )
      continue
    }

    const load = INJURY_AREA_LOAD_MAP[area]

    if (severity === 'caution') {
      for (const pattern of load.patterns) cautionedPatterns.add(pattern)
      for (const fau of load.faus) cautionedFAUs.add(fau)
      continue
    }

    // avoid_loading -> hard ban every exercise that loads the area.
    for (const exercise of exercises) {
      if (exerciseLoadsArea(exercise, load)) {
        banned.add(exercise.id)
      }
    }
  }

  return {
    bannedExerciseIds: [...banned].sort(),
    cautionedMovementPatterns: [...cautionedPatterns].sort(),
    cautionedFAUs: [...cautionedFAUs].sort(),
    notes,
  }
}
