import { z } from 'zod'

/**
 * Supersets in program and saved-workout proposals
 * (features/agent-tools/proposal-supersets.feature). Each exercise may carry a
 * `group` label; approve stores it as `exerciseGroup`, which the logger shows
 * as "Superset A". Labels are case-insensitive and stored upper case.
 */

export const GROUP_DESCRIPTION =
  'Optional superset label, 1–3 letters (A, B, AB). Exercises with the same label in one workout are a superset: at least two, next to each other. Omit for a straight set.'

export const exerciseGroup = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{1,3}$/, 'group must be 1–3 letters (A, B, AB)')
  .toUpperCase()
  .describe(GROUP_DESCRIPTION)

/**
 * One workout's exercises: each group has at least two exercises, all next to
 * each other. Issues name the offending exercise's `group`.
 */
export function withGroupRules<T extends z.ZodType<Array<{ group?: string }>>>(list: T): T {
  return list.superRefine((exercises, ctx) => {
    const first = new Map<string, number>()
    const counts = new Map<string, number>()
    exercises.forEach((exercise, i) => {
      const group = exercise.group
      if (!group) return
      if (first.has(group) && exercises[i - 1]?.group !== group) {
        ctx.addIssue({ code: 'custom', message: `group ${group}: grouped exercises must sit next to each other`, path: [i, 'group'] })
      }
      if (!first.has(group)) first.set(group, i)
      counts.set(group, (counts.get(group) ?? 0) + 1)
    })
    for (const [group, count] of counts) {
      if (count < 2) {
        ctx.addIssue({
          code: 'custom',
          message: `group ${group} needs at least two exercises in the same workout`,
          path: [first.get(group) as number, 'group'],
        })
      }
    }
  }) as T
}
