import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALL_FAUS } from '@/lib/fau-volume'

/**
 * FAU taxonomy hygiene (issue #959).
 *
 * Every `primaryFAUs` / `secondaryFAUs` token in the seed catalog must be a
 * member of ALL_FAUS. Off-list tokens (e.g. `abductors`, `hip-flexors`) have no
 * target in per-FAU scoring, so any comparison against them silently no-ops.
 *
 * These tests guard both seed sources so a new catalog entry — or a reseed —
 * cannot reintroduce an off-list token without failing CI.
 */

const SEEDS_DIR = join(__dirname, '..', '..', 'prisma', 'seeds')
const VALID_FAUS = new Set<string>(ALL_FAUS)

function assertTokensValid(source: string, tokens: string[]) {
  const offList = [...new Set(tokens.filter((t) => !VALID_FAUS.has(t)))]
  expect(
    offList,
    `${source} contains FAU tokens not in ALL_FAUS: ${offList.join(', ')}`
  ).toEqual([])
}

describe('FAU taxonomy hygiene', () => {
  it('exercise-definitions.json uses only valid FAU tokens', () => {
    const raw = readFileSync(
      join(SEEDS_DIR, 'exercise-definitions.json'),
      'utf8'
    )
    const defs = JSON.parse(raw) as Array<{
      primaryFAUs?: string[]
      secondaryFAUs?: string[]
    }>

    const tokens = defs.flatMap((d) => [
      ...(d.primaryFAUs ?? []),
      ...(d.secondaryFAUs ?? []),
    ])

    expect(tokens.length).toBeGreaterThan(0)
    assertTokensValid('exercise-definitions.json', tokens)
  })

  it('08_curated_exercises.sql uses only valid FAU tokens', () => {
    const sql = readFileSync(
      join(SEEDS_DIR, '08_curated_exercises.sql'),
      'utf8'
    )

    // Each INSERT row has exactly four ARRAY[...] literals in column order:
    // aliases, equipment, primaryFAUs, secondaryFAUs. Collect them in order
    // and pull the FAU arrays (indexes 2 and 3 within each group of four).
    const arrayLiterals = [...sql.matchAll(/ARRAY\[([^\]]*)\]/g)].map(
      (m) => m[1]
    )
    expect(arrayLiterals.length % 4).toBe(0)
    expect(arrayLiterals.length).toBeGreaterThan(0)

    const extractTokens = (literal: string) =>
      [...literal.matchAll(/'([^']*)'/g)].map((m) => m[1])

    const tokens: string[] = []
    for (let i = 0; i < arrayLiterals.length; i += 4) {
      tokens.push(...extractTokens(arrayLiterals[i + 2])) // primaryFAUs
      tokens.push(...extractTokens(arrayLiterals[i + 3])) // secondaryFAUs
    }

    expect(tokens.length).toBeGreaterThan(0)
    assertTokensValid('08_curated_exercises.sql', tokens)
  })
})
