/**
 * Deterministic seeded RNG for scenario generation. Same seed string →
 * same sequence, across machines and runs. Do NOT use Math.random
 * anywhere in the eval loop — reproducibility is a hard requirement.
 */

/** FNV-1a 32-bit hash of a string → uint32 seed. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number
  /** Pick one element. Throws on empty array. */
  pick<T>(items: readonly T[]): T
  /** Fisher–Yates shuffle (returns a new array). */
  shuffle<T>(items: readonly T[]): T[]
  /** True with probability p. */
  chance(p: number): boolean
  /** Fork a child RNG whose stream is independent of the parent's. */
  fork(label: string): Rng
}

/** mulberry32 — small, fast, good-enough distribution for test data. */
export function createRng(seed: string): Rng {
  let state = hashSeed(seed)

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const rng: Rng = {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1))
    },
    pick(items) {
      if (items.length === 0) throw new Error('rng.pick: empty array')
      return items[Math.floor(next() * items.length)]
    },
    shuffle(items) {
      const copy = [...items]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
    chance(p) {
      return next() < p
    },
    fork(label) {
      return createRng(`${seed}::${label}`)
    },
  }
  return rng
}
